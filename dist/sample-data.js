// Entirely fabricated test scenarios. Locality names are contextual labels, not observations.
const rows=[
 ['SYN-001','T. Nagar · demo',4,1,280,38,200,'Concrete',125,3,22000,130],
 ['SYN-002','Anna Nagar · demo',1,3,60,16,450,'PVC',48,0,12000,60],
 ['SYN-003','Royapuram · demo',5,0,420,48,150,'Vitrified clay',142,4,26000,170],
 ['SYN-004','Adyar · demo',0,4,25,8,500,'HDPE',20,0,9000,20],
 ['SYN-005','Mylapore · demo',2,2,150,25,300,'Cast iron',65,1,15000,85],
 ['SYN-006','Tondiarpet · demo',3,1,245,42,250,'Brick',95,2,21000,110],
 ['SYN-007','Besant Nagar · demo',0,4,18,12,600,'PVC',15,0,6500,15],
 ['SYN-008','Perambur · demo',2,2,175,22,350,'Concrete',80,1,17000,70],
 ['SYN-009','Velachery · demo',1,3,85,18,400,'Concrete',40,0,14000,45],
 ['SYN-010','Triplicane · demo',4,1,310,35,200,'Cast iron',110,3,19000,125],
 ['SYN-011','Sholinganallur · demo',1,2,125,15,450,'HDPE',60,1,10000,90],
 ['SYN-012','Guindy · demo',0,3,45,10,500,'PVC',35,0,8500,25]
];
export const sampleRecords=rows.map(([record_id,location,previous_blockages_12m,cleanings_12m,days_since_cleaning,pipe_age_years,diameter_mm,material,rainfall_7d_mm,flooding_events_12m,population_per_km2,commercial_sites_per_km2])=>({record_id,location,assessment_date:'2026-10-06',previous_blockages_12m,cleanings_12m,days_since_cleaning,pipe_age_years,diameter_mm,material,rainfall_7d_mm,flooding_events_12m,population_per_km2,commercial_sites_per_km2,data_source:'Synthetic sample',source_note:'Fabricated demonstration scenario. No CMWSSB observations or real sewer assets.'}));
