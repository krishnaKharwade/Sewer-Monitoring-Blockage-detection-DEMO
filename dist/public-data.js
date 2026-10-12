/** A complete 7-day rainfall window strictly before the assessment date. */
export function rainfallWindow(index,station,date){
 if(!index?.stations?.[station])throw new Error('Choose a known rainfall station.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('Choose a valid assessment date.');
 const readings=[];let sum=0;
 for(let i=7;i>=1;i--){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-i);const day=d.toISOString().slice(0,10),v=index.stations[station][day];const known=typeof v==='number'&&Number.isFinite(v)&&v>=0;readings.push({date:day,value:known?v:null,status:known?'observed':v===null?'conflicting':'missing'});if(known)sum+=v;}
 const observed=readings.filter(r=>r.status==='observed').length;
 return {station,assessment_date:date,readings,observed_days:observed,complete:observed===7,sum_mm:Math.round(sum*10)/10};
}
