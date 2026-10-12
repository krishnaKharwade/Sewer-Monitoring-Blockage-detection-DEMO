/** AL Sewer Health prototype v0.1. All weights are engineering assumptions, not learned coefficients. */
export const MODEL_VERSION = 'screening-v0.1';
export const numericFields = {
  previous_blockages_12m: { label: 'Blockages in the last 12 months', min: 0, max: 100, integer: true },
  cleanings_12m: { label: 'Cleanings in the last 12 months', min: 0, max: 365, integer: true },
  days_since_cleaning: { label: 'Days since cleaning', min: 0, max: 36500, integer: true },
  pipe_age_years: { label: 'Pipe age (years)', min: 0, max: 150 },
  diameter_mm: { label: 'Diameter (mm)', min: 50, max: 5000 },
  rainfall_7d_mm: { label: 'Rainfall in the previous 7 days (mm)', min: 0, max: 3000 },
  flooding_events_12m: { label: 'Flooding events in the last 12 months', min: 0, max: 100, integer: true },
  population_per_km2: { label: 'Population density (people/km²)', min: 0, max: 200000 },
  commercial_sites_per_km2: { label: 'Commercial density (sites/km²)', min: 0, max: 10000 }
};
export const materials = ['PVC','HDPE','Concrete','Vitrified clay','Cast iron','Brick','SW Pipe','DI Pipe','DWC Pipe','PSC Pipe','MS Pipe','Unknown'];
export const sources = ['Synthetic sample','User supplied','Mixed / estimated','Public / municipal'];
export const columns = ['record_id','location','assessment_date','material',...Object.keys(numericFields),'data_source','source_note'];
export function validateRecord(input) {
  const record = {}, errors = [];
  for (const field of ['record_id','location','assessment_date','material','data_source','source_note']) record[field] = String(input[field] ?? '').trim();
  if (!record.record_id || record.record_id.length > 80) errors.push('Record ID is required (maximum 80 characters).');
  if (!record.location || record.location.length > 160) errors.push('Location is required (maximum 160 characters).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.assessment_date) || !Number.isFinite(Date.parse(record.assessment_date)) || new Date(record.assessment_date).toISOString().slice(0,10) !== record.assessment_date) errors.push('Assessment date must be a valid YYYY-MM-DD date.');
  if (!materials.includes(record.material)) errors.push('Material must be one of: '+materials.join(', ')+'.');
  if (!sources.includes(record.data_source)) errors.push('Data source must be Synthetic sample, User supplied, Mixed / estimated, or Public / municipal.');
  if (!record.source_note || record.source_note.length > 500) errors.push('Provide a source note (maximum 500 characters).');
  for (const [key, def] of Object.entries(numericFields)) {
    const raw=input[key];
    if (raw === null || raw === undefined || String(raw).trim()==='') { errors.push(def.label+' is required; missing values cannot be treated as zero.'); continue; }
    const v=Number(raw);
    if (!Number.isFinite(v) || v<def.min || v>def.max || (def.integer && !Number.isInteger(v))) { errors.push(def.label+' must be '+(def.integer?'a whole number':'a number')+' from '+def.min+' to '+def.max+'.'); continue; }
    record[key]=v;
  }
  return { record, errors };
}
const cap=x=>Math.max(0,Math.min(1,x));
export function predict(input) {
  const {record:r,errors}=validateRecord(input);
  if(errors.length) throw new Error(errors.join('\n'));
  const factor=(key,label,weight,value,detail)=>({key,label,weight,points:weight*cap(value),detail});
  const m={PVC:.15,HDPE:.15,Concrete:.55,'Vitrified clay':.8,'Cast iron':.7,Brick:.9,'SW Pipe':.8,'DI Pipe':.5,'DWC Pipe':.3,'PSC Pipe':.6,'MS Pipe':.65,Unknown:.5};
  const factors=[
    factor('previous_blockages_12m','Repeated blockages',22,r.previous_blockages_12m/5,r.previous_blockages_12m+' events in the last 12 months'),
    factor('days_since_cleaning','Time since cleaning',14,r.days_since_cleaning/365,r.days_since_cleaning+' days since last cleaning'),
    factor('cleanings_12m','Cleaning frequency',4,1-r.cleanings_12m/4,r.cleanings_12m+' cleanings in the last 12 months'),
    factor('pipe_age_years','Pipe age',10,r.pipe_age_years/50,r.pipe_age_years+' years old'),
    factor('diameter_mm','Pipe diameter',8,(600-r.diameter_mm)/500,r.diameter_mm+' mm diameter'),
    factor('material','Pipe material',8,m[r.material],r.material+' — assumed material susceptibility'),
    factor('rainfall_7d_mm','Recent rainfall',14,r.rainfall_7d_mm/150,r.rainfall_7d_mm+' mm over the previous 7 days'),
    factor('flooding_events_12m','Flooding history',10,r.flooding_events_12m/4,r.flooding_events_12m+' events in the last 12 months'),
    factor('population_per_km2','Population density',6,r.population_per_km2/25000,r.population_per_km2.toLocaleString('en-IN')+' people/km²'),
    factor('commercial_sites_per_km2','Commercial density',4,r.commercial_sites_per_km2/150,r.commercial_sites_per_km2+' sites/km²')
  ];
  const total=factors.reduce((a,f)=>a+f.points,0), score=Math.round(total), level=score>=65?'High':score>=35?'Moderate':'Low';
  factors.sort((a,b)=>b.points-a.points);
  return {score,level,factors,model_version:MODEL_VERSION,record:r,confidence:'Not calibrated',action:level==='High'?'Prioritise a maintenance review and verify recent incidents.':level==='Moderate'?'Review cleaning history and monitor recent rainfall.':'Continue routine maintenance and verify the asset record.'};
}
export function cleaningScenario(record) { return predict({...record,days_since_cleaning:0,cleanings_12m:Math.max(4,record.cleanings_12m)}); }
/** RFC-style quoted CSV parser; import is atomic and capped for browser responsiveness. */
export function parseCSV(text) {
  if(typeof text!=='string') throw new Error('CSV content must be text.');
  if(text.length>2*1024*1024) throw new Error('CSV must be smaller than 2 MB.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field.length||closed)throw new Error('Unexpected quote in CSV.');quoted=true;continue;}
    if(c===','||c==='\n'||c==='\r'){
      row.push(field);field='';closed=false;
      if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()!==''))rows.push(row);row=[];}
      continue;
    }
    if(closed)throw new Error('Unexpected characters after closing CSV quote.');
    field+=c;
  }
  if(quoted)throw new Error('CSV has an unclosed quote.');
  row.push(field);if(row.some(v=>v.trim()!==''))rows.push(row);
  if(rows.length<2)throw new Error('CSV needs a header and at least one record.');
  const headers=rows.shift().map(v=>v.trim());
  if(new Set(headers).size!==headers.length)throw new Error('CSV contains duplicate headers.');
  const missing=columns.filter(k=>!headers.includes(k));if(missing.length)throw new Error('Missing columns: '+missing.join(', '));
  if(rows.length>1000)throw new Error('Upload no more than 1,000 records per batch.');
  const ids=new Set(),records=[],errors=[];
  rows.forEach((values,i)=>{
    if(values.length!==headers.length){errors.push('Row '+(i+2)+': wrong number of columns.');return;}
    const input=Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
    const v=validateRecord(input);
    if(v.errors.length)errors.push('Row '+(i+2)+': '+v.errors.join(' '));
    if(ids.has(v.record.record_id))errors.push('Row '+(i+2)+': duplicate record ID '+v.record.record_id+'.');
    ids.add(v.record.record_id);records.push(v.record);
  });
  if(errors.length)throw new Error(errors.slice(0,8).join('\n')+(errors.length>8?'\n'+(errors.length-8)+' more errors.':''));
  return records;
}
// Prevent spreadsheet formula execution for user-supplied text in downloads.
export function toCSV(records,includeResults=false){
  const keys=includeResults?[...columns,'risk_score','risk_level','model_version']:columns;
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [keys.map(cell).join(','),...records.map(r=>{const p=includeResults?predict(r):null;return keys.map(k=>cell(k==='risk_score'?p.score:k==='risk_level'?p.level:k==='model_version'?MODEL_VERSION:r[k])).join(',');})].join('\r\n');
}
