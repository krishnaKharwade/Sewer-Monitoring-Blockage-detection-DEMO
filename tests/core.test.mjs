import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {predict,validateRecord,cleaningScenario,parseCSV,toCSV,numericFields,materials,columns} from '../dist/model.js';
import {sampleRecords} from '../dist/sample-data.js';
import {rainfallWindow} from '../dist/public-data.js';
const base={...sampleRecords[0]};
test('sample cases cover Low, Moderate and High; bounded scores and additive explanations',()=>{
 const results=sampleRecords.map(predict);assert.deepEqual(new Set(results.map(p=>p.level)),new Set(['High','Moderate','Low']));
 for(const p of results){assert(p.score>=0&&p.score<=100);assert.equal(p.factors.length,10);assert.equal(Math.round(p.factors.reduce((sum,f)=>sum+f.points,0)),p.score);assert.equal(p.factors.reduce((sum,f)=>sum+f.weight,0),100);}
});
test('missing, invalid and fractional count inputs are rejected instead of imputed',()=>{
 for(const [k,d] of Object.entries(numericFields)){assert(validateRecord({...base,[k]:''}).errors.length);assert(validateRecord({...base,[k]:-1}).errors.length);assert(validateRecord({...base,[k]:d.max+1}).errors.length);}
 assert.throws(()=>predict({...base,previous_blockages_12m:1.5}));assert.throws(()=>predict({...base,assessment_date:'2026-02-30'}));assert.throws(()=>predict({...base,material:'Steel?'}));assert.throws(()=>predict({...base,data_source:'Real'}));
});
test('higher blockages, rainfall and delay cannot lower risk; maintenance scenario cannot raise risk',()=>{
 for(const r of sampleRecords){const p=predict(r);assert(predict({...r,previous_blockages_12m:r.previous_blockages_12m+1}).score>=p.score);assert(predict({...r,rainfall_7d_mm:r.rainfall_7d_mm+100}).score>=p.score);assert(predict({...r,days_since_cleaning:r.days_since_cleaning+100}).score>=p.score);assert(cleaningScenario(r).score<=p.score);}
});
test('CSV round trip preserves provenance and quoted text; result export includes model version',()=>{
 const input=[{...base,location:'Road, "North"\nChennai',data_source:'Mixed / estimated'}];const output=toCSV(input);assert.deepEqual(parseCSV(output),input);const result=toCSV(input,true);assert(result.includes('risk_score'));assert(result.includes('screening-v0.1'));assert.equal(parseCSV(result)[0].source_note,base.source_note);
});
test('batch validation rejects duplicate IDs, missing headers, malformed CSV, and bad rows',()=>{
 assert.throws(()=>parseCSV(toCSV([base,base])),/duplicate/i);assert.throws(()=>parseCSV('record_id,location\n1,test'),/Missing columns/);assert.throws(()=>parseCSV(toCSV([base]).replace('"4"','"invalid"')),/Row 2/);assert.throws(()=>parseCSV('"open'),/unclosed quote/);assert.throws(()=>parseCSV(toCSV(Array.from({length:1001},(_,i)=>({...base,record_id:'ROW-'+i})))),/1,000/);
 const malicious=toCSV([{...base,location:'=HYPERLINK("bad")'}]);assert(malicious.includes("'=HYPERLINK"));
});
test('public sewer subset has decoded source dimensions and no fabricated maintenance values',()=>{
 const data=JSON.parse(readFileSync(new URL('../dist/data/chennai-sewer-subset.json',import.meta.url)));assert.equal(data.assets.length,data.meta.subset_count);assert.equal(data.assets[0].diameter_mm,250);assert.equal(data.assets[0].source_material,'SW Pipe');for(const a of data.assets){assert(materials.includes(a.model_material));assert(a.diameter_mm>=50);assert(a.asset_id);assert(!Object.hasOwn(a,'previous_blockages_12m'));}
});
test('public rainfall sums seven preceding dates; gaps and conflicting values block application',()=>{
 const d=JSON.parse(readFileSync(new URL('../dist/data/chennai-rainfall-index.json',import.meta.url)));const r=rainfallWindow(d,d.meta.default_station,d.meta.default_date);assert(r.complete);assert.equal(r.observed_days,7);assert.equal(r.sum_mm,3.4);assert(r.readings.every(day=>day.date<r.assessment_date));
 const incomplete=rainfallWindow(d,d.meta.default_station,'2026-10-06');assert(!incomplete.complete);assert.equal(incomplete.observed_days,0);
 const fake={stations:{Test:{'2026-10-05':null,'2026-10-04':0}}};const gap=rainfallWindow(fake,'Test','2026-10-06');assert.equal(gap.observed_days,1);assert.equal(gap.readings.at(-1).status,'conflicting');assert.equal(gap.readings.at(-2).status,'observed');assert.throws(()=>rainfallWindow(d,'missing','2026-10-06'));
});
