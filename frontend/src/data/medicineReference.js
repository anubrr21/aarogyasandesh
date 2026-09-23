
export const MEDICINE_REFERENCE = [
  { generic: 'Paracetamol', brands: ['Dolo', 'Crocin', 'Calpol'], strengths: ['500 MG', '650 MG'], form: 'Tablet', category: 'Analgesic/Antipyretic' },
  { generic: 'Paracetamol', brands: ['Crocin', 'Calpol'], strengths: ['150 MG/ML'], form: 'Injection', category: 'Analgesic/Antipyretic' },
  { generic: 'Ibuprofen', brands: ['Brufen'], strengths: ['200 MG', '400 MG', '600 MG'], form: 'Tablet', category: 'NSAID' },
  { generic: 'Ibuprofen + Paracetamol', brands: ['Combiflam'], strengths: ['400 MG/325 MG'], form: 'Tablet', category: 'NSAID' },
  { generic: 'Diclofenac', brands: ['Voveran'], strengths: ['50 MG', '75 MG'], form: 'Tablet', category: 'NSAID' },
  { generic: 'Diclofenac', brands: ['Voveran'], strengths: ['75 MG/3ML'], form: 'Injection', category: 'NSAID' },
  { generic: 'Aceclofenac', brands: ['Zerodol', 'Hifenac'], strengths: ['100 MG'], form: 'Tablet', category: 'NSAID' },
  { generic: 'Nimesulide', brands: ['Nise'], strengths: ['100 MG'], form: 'Tablet', category: 'NSAID' },
  { generic: 'Mefenamic Acid + Dicyclomine', brands: ['Meftal Spas'], strengths: ['250 MG/10 MG'], form: 'Tablet', category: 'Analgesic/Antispasmodic' },
  { generic: 'Tramadol', brands: ['Ultracet (with Paracetamol)'], strengths: ['37.5 MG/325 MG'], form: 'Tablet', category: 'Analgesic' },

  { generic: 'Amoxicillin', brands: ['Novamox', 'Mox'], strengths: ['250 MG', '500 MG'], form: 'Capsule', category: 'Antibiotic' },
  { generic: 'Amoxicillin + Clavulanic Acid', brands: ['Augmentin', 'Clavam'], strengths: ['625 MG', '1 G'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Azithromycin', brands: ['Azithral', 'Azee'], strengths: ['250 MG', '500 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Ciprofloxacin', brands: ['Ciplox'], strengths: ['250 MG', '500 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Ofloxacin', brands: ['Zenflox'], strengths: ['200 MG', '400 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Norfloxacin', brands: ['Norflox'], strengths: ['400 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Levofloxacin', brands: ['Levoflox'], strengths: ['500 MG', '750 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Doxycycline', brands: ['Doxy 100'], strengths: ['100 MG'], form: 'Capsule', category: 'Antibiotic' },
  { generic: 'Cefixime', brands: ['Taxim-O', 'Zifi'], strengths: ['200 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Cefpodoxime', brands: ['Cepodem'], strengths: ['100 MG', '200 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Ceftriaxone', brands: ['Monocef'], strengths: ['1 G'], form: 'Injection', category: 'Antibiotic' },
  { generic: 'Metronidazole', brands: ['Metrogyl', 'Flagyl'], strengths: ['400 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Ornidazole', brands: ['Ornof'], strengths: ['500 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Clindamycin', brands: ['Dalacin C', 'Clindac'], strengths: ['150 MG', '300 MG'], form: 'Capsule', category: 'Antibiotic' },
  { generic: 'Linezolid', brands: ['Lizolid'], strengths: ['600 MG'], form: 'Tablet', category: 'Antibiotic' },
  { generic: 'Piperacillin + Tazobactam', brands: ['Zosyn', 'Piptaz'], strengths: ['4.5 G'], form: 'Injection', category: 'Antibiotic' },
  { generic: 'Meropenem', brands: ['Meronem'], strengths: ['1 G'], form: 'Injection', category: 'Antibiotic' },
  { generic: 'Albendazole', brands: ['Zentel'], strengths: ['400 MG'], form: 'Tablet', category: 'Antiparasitic' },
  { generic: 'Ivermectin', brands: ['Ivecop'], strengths: ['12 MG'], form: 'Tablet', category: 'Antiparasitic' },
  { generic: 'Fluconazole', brands: ['Forcan'], strengths: ['150 MG'], form: 'Tablet', category: 'Antifungal' },
  { generic: 'Itraconazole', brands: ['Sporanox'], strengths: ['100 MG'], form: 'Capsule', category: 'Antifungal' },
  { generic: 'Oseltamivir', brands: ['Fluvir', 'Tamiflu'], strengths: ['75 MG'], form: 'Capsule', category: 'Antiviral' },
  { generic: 'Acyclovir', brands: ['Zovirax'], strengths: ['200 MG', '400 MG'], form: 'Tablet', category: 'Antiviral' },

  { generic: 'Omeprazole', brands: ['Omez'], strengths: ['20 MG', '40 MG'], form: 'Capsule', category: 'PPI' },
  { generic: 'Pantoprazole', brands: ['Pan', 'Pantop'], strengths: ['20 MG', '40 MG'], form: 'Tablet', category: 'PPI' },
  { generic: 'Rabeprazole', brands: ['Rablet'], strengths: ['20 MG'], form: 'Tablet', category: 'PPI' },
  { generic: 'Esomeprazole', brands: ['Nexpro'], strengths: ['20 MG', '40 MG'], form: 'Tablet', category: 'PPI' },
  { generic: 'Ranitidine', brands: ['Rantac'], strengths: ['150 MG', '300 MG'], form: 'Tablet', category: 'Antacid' },
  { generic: 'Domperidone', brands: ['Domstal'], strengths: ['10 MG'], form: 'Tablet', category: 'Antiemetic' },
  { generic: 'Ondansetron', brands: ['Emeset'], strengths: ['4 MG', '8 MG'], form: 'Tablet', category: 'Antiemetic' },
  { generic: 'Metoclopramide', brands: ['Perinorm'], strengths: ['10 MG'], form: 'Tablet', category: 'Antiemetic' },
  { generic: 'Dicyclomine', brands: ['Cyclopam'], strengths: ['20 MG'], form: 'Tablet', category: 'Antispasmodic' },
  { generic: 'Lactulose', brands: ['Duphalac'], strengths: ['10 G/15ML'], form: 'Syrup', category: 'Laxative' },
  { generic: 'Ispaghula Husk', brands: ['Isabgol', 'Fybogel'], strengths: ['3.5 G'], form: 'Sachet', category: 'Laxative' },
  { generic: 'Ondansetron', brands: ['Emeset'], strengths: ['2 MG/ML'], form: 'Injection', category: 'Antiemetic' },
  { generic: 'Aluminium Hydroxide + Magnesium Hydroxide', brands: ['Digene', 'Gelusil'], strengths: ['Standard'], form: 'Tablet', category: 'Antacid' },
  { generic: 'ORS', brands: ['Electral'], strengths: ['21 G/packet'], form: 'Oral Solution', category: 'Rehydration' },

  { generic: 'Cetirizine', brands: ['Cetrizine', 'Alerid'], strengths: ['10 MG'], form: 'Tablet', category: 'Antihistamine' },
  { generic: 'Levocetirizine', brands: ['Levorid'], strengths: ['5 MG'], form: 'Tablet', category: 'Antihistamine' },
  { generic: 'Fexofenadine', brands: ['Allegra'], strengths: ['120 MG', '180 MG'], form: 'Tablet', category: 'Antihistamine' },
  { generic: 'Chlorpheniramine', brands: ['Piriton'], strengths: ['4 MG'], form: 'Tablet', category: 'Antihistamine' },
  { generic: 'Montelukast', brands: ['Montair'], strengths: ['10 MG'], form: 'Tablet', category: 'Anti-allergic' },
  { generic: 'Montelukast + Levocetirizine', brands: ['Montair-LC'], strengths: ['10 MG/5 MG'], form: 'Tablet', category: 'Anti-allergic' },

  { generic: 'Amlodipine', brands: ['Amlong', 'Amlopres'], strengths: ['2.5 MG', '5 MG', '10 MG'], form: 'Tablet', category: 'Antihypertensive' },
  { generic: 'Telmisartan', brands: ['Telma'], strengths: ['20 MG', '40 MG', '80 MG'], form: 'Tablet', category: 'Antihypertensive' },
  { generic: 'Losartan', brands: ['Losar'], strengths: ['25 MG', '50 MG'], form: 'Tablet', category: 'Antihypertensive' },
  { generic: 'Metoprolol', brands: ['Met XL', 'Betaloc'], strengths: ['25 MG', '50 MG', '100 MG'], form: 'Tablet', category: 'Beta Blocker' },
  { generic: 'Atenolol', brands: ['Aten'], strengths: ['25 MG', '50 MG'], form: 'Tablet', category: 'Beta Blocker' },
  { generic: 'Enalapril', brands: ['Envas'], strengths: ['2.5 MG', '5 MG', '10 MG'], form: 'Tablet', category: 'ACE Inhibitor' },
  { generic: 'Ramipril', brands: ['Cardace'], strengths: ['2.5 MG', '5 MG'], form: 'Tablet', category: 'ACE Inhibitor' },
  { generic: 'Furosemide', brands: ['Lasix'], strengths: ['20 MG', '40 MG'], form: 'Tablet', category: 'Diuretic' },
  { generic: 'Spironolactone', brands: ['Aldactone'], strengths: ['25 MG', '50 MG'], form: 'Tablet', category: 'Diuretic' },
  { generic: 'Hydrochlorothiazide', brands: ['Aquazide'], strengths: ['12.5 MG', '25 MG'], form: 'Tablet', category: 'Diuretic' },
  { generic: 'Atorvastatin', brands: ['Atorva', 'Storvas'], strengths: ['10 MG', '20 MG', '40 MG'], form: 'Tablet', category: 'Statin' },
  { generic: 'Rosuvastatin', brands: ['Rosuvas'], strengths: ['5 MG', '10 MG', '20 MG'], form: 'Tablet', category: 'Statin' },
  { generic: 'Aspirin', brands: ['Ecosprin'], strengths: ['75 MG', '150 MG'], form: 'Tablet', category: 'Antiplatelet' },
  { generic: 'Clopidogrel', brands: ['Clopilet'], strengths: ['75 MG'], form: 'Tablet', category: 'Antiplatelet' },
  { generic: 'Digoxin', brands: ['Lanoxin'], strengths: ['0.25 MG'], form: 'Tablet', category: 'Cardiac Glycoside' },
  { generic: 'Nitroglycerin', brands: ['Angised', 'Sorbitrate'], strengths: ['5 MG', '0.5 MG'], form: 'Sublingual Tablet', category: 'Vasodilator' },
  { generic: 'Heparin', brands: [], strengths: ['5000 IU/ML'], form: 'Injection', category: 'Anticoagulant' },
  { generic: 'Enoxaparin', brands: ['Clexane'], strengths: ['40 MG', '60 MG'], form: 'Injection', category: 'Anticoagulant' },
  { generic: 'Warfarin', brands: ['Warf'], strengths: ['1 MG', '2 MG', '5 MG'], form: 'Tablet', category: 'Anticoagulant' },

  { generic: 'Metformin', brands: ['Glycomet'], strengths: ['500 MG', '850 MG', '1000 MG'], form: 'Tablet', category: 'Antidiabetic' },
  { generic: 'Glimepiride', brands: ['Glimestar', 'Amaryl'], strengths: ['1 MG', '2 MG', '4 MG'], form: 'Tablet', category: 'Antidiabetic' },
  { generic: 'Sitagliptin', brands: ['Januvia'], strengths: ['50 MG', '100 MG'], form: 'Tablet', category: 'Antidiabetic' },
  { generic: 'Insulin (Human, Mixtard 30/70)', brands: ['Mixtard'], strengths: ['40 IU/ML', '100 IU/ML'], form: 'Injection', category: 'Antidiabetic' },
  { generic: 'Insulin Glargine', brands: ['Lantus'], strengths: ['100 IU/ML'], form: 'Injection', category: 'Antidiabetic' },
  { generic: 'Levothyroxine', brands: ['Thyronorm', 'Eltroxin'], strengths: ['25 MCG', '50 MCG', '100 MCG'], form: 'Tablet', category: 'Thyroid' },

  { generic: 'Salbutamol', brands: ['Asthalin'], strengths: ['100 MCG/dose'], form: 'Inhaler', category: 'Bronchodilator' },
  { generic: 'Salbutamol', brands: ['Asthalin'], strengths: ['2 MG/5ML'], form: 'Syrup', category: 'Bronchodilator' },
  { generic: 'Budesonide + Formoterol', brands: ['Foracort'], strengths: ['200/6 MCG', '400/6 MCG'], form: 'Inhaler', category: 'Bronchodilator' },
  { generic: 'Budesonide', brands: ['Budecort'], strengths: ['100 MCG', '200 MCG'], form: 'Inhaler', category: 'Corticosteroid' },
  { generic: 'Deriphylline (Etophylline + Theophylline)', brands: ['Deriphyllin'], strengths: ['Standard'], form: 'Injection', category: 'Bronchodilator' },
  { generic: 'Ambroxol', brands: ['Ambrolite', 'Mucolite'], strengths: ['30 MG'], form: 'Tablet', category: 'Mucolytic' },
  { generic: 'Levosalbutamol + Ambroxol', brands: ['Levolin'], strengths: ['Standard'], form: 'Syrup', category: 'Bronchodilator' },

  { generic: 'Prednisolone', brands: ['Wysolone'], strengths: ['5 MG', '10 MG', '20 MG'], form: 'Tablet', category: 'Corticosteroid' },
  { generic: 'Dexamethasone', brands: ['Decadron'], strengths: ['4 MG/ML'], form: 'Injection', category: 'Corticosteroid' },
  { generic: 'Hydrocortisone', brands: ['Efcorlin'], strengths: ['100 MG'], form: 'Injection', category: 'Corticosteroid' },
  { generic: 'Methylprednisolone', brands: ['Solu-Medrol'], strengths: ['40 MG', '125 MG'], form: 'Injection', category: 'Corticosteroid' },

  { generic: 'Lorazepam', brands: ['Ativan'], strengths: ['1 MG', '2 MG'], form: 'Tablet', category: 'Anxiolytic' },
  { generic: 'Alprazolam', brands: ['Alprax', 'Restyl'], strengths: ['0.25 MG', '0.5 MG'], form: 'Tablet', category: 'Anxiolytic' },
  { generic: 'Diazepam', brands: ['Calmpose'], strengths: ['5 MG', '10 MG'], form: 'Tablet', category: 'Anxiolytic' },
  { generic: 'Zolpidem', brands: ['Zolfresh'], strengths: ['5 MG', '10 MG'], form: 'Tablet', category: 'Sedative' },
  { generic: 'Amitriptyline', brands: ['Tryptomer'], strengths: ['10 MG', '25 MG'], form: 'Tablet', category: 'Antidepressant' },
  { generic: 'Sertraline', brands: ['Zoloft'], strengths: ['50 MG', '100 MG'], form: 'Tablet', category: 'Antidepressant' },
  { generic: 'Escitalopram', brands: ['Nexito'], strengths: ['5 MG', '10 MG'], form: 'Tablet', category: 'Antidepressant' },

  { generic: 'Phenytoin', brands: ['Eptoin'], strengths: ['100 MG'], form: 'Tablet', category: 'Antiepileptic' },
  { generic: 'Sodium Valproate', brands: ['Valparin'], strengths: ['200 MG', '500 MG'], form: 'Tablet', category: 'Antiepileptic' },
  { generic: 'Levetiracetam', brands: ['Levipil'], strengths: ['250 MG', '500 MG'], form: 'Tablet', category: 'Antiepileptic' },
  { generic: 'Carbamazepine', brands: ['Tegretol'], strengths: ['200 MG', '400 MG'], form: 'Tablet', category: 'Antiepileptic' },

  { generic: 'Calcium Carbonate + Vitamin D3', brands: ['Shelcal'], strengths: ['500 MG'], form: 'Tablet', category: 'Supplement' },
  { generic: 'Vitamin B-Complex', brands: ['Becosules', 'Neurobion'], strengths: ['Standard'], form: 'Capsule', category: 'Supplement' },
  { generic: 'Vitamin C', brands: ['Limcee'], strengths: ['500 MG'], form: 'Chewable Tablet', category: 'Supplement' },
  { generic: 'Folic Acid', brands: ['Folvite'], strengths: ['5 MG'], form: 'Tablet', category: 'Supplement' },
  { generic: 'Iron + Folic Acid', brands: ['Livogen', 'Fefol'], strengths: ['Standard'], form: 'Tablet', category: 'Supplement' },
  { generic: 'Multivitamin + Multimineral', brands: ['A to Z', 'Zincovit'], strengths: ['Standard'], form: 'Tablet', category: 'Supplement' },
  { generic: 'Vitamin D3', brands: ['Calcirol'], strengths: ['60000 IU'], form: 'Sachet', category: 'Supplement' },

  { generic: 'Normal Saline (Sodium Chloride 0.9%)', brands: [], strengths: ['500 ML', '1000 ML'], form: 'IV Fluid', category: 'IV Fluid' },
  { generic: 'Ringer Lactate', brands: [], strengths: ['500 ML'], form: 'IV Fluid', category: 'IV Fluid' },
  { generic: 'Dextrose 5%', brands: ['DNS'], strengths: ['500 ML'], form: 'IV Fluid', category: 'IV Fluid' },
  { generic: 'Mannitol', brands: [], strengths: ['20%'], form: 'IV Fluid', category: 'Diuretic' },

  { generic: 'Diclofenac Gel', brands: ['Voveran Gel'], strengths: ['1%'], form: 'Topical Gel', category: 'NSAID (Topical)' },
  { generic: 'Mupirocin', brands: ['T-Bact'], strengths: ['2%'], form: 'Topical Ointment', category: 'Antibiotic (Topical)' },
  { generic: 'Clotrimazole', brands: ['Candid'], strengths: ['1%'], form: 'Topical Cream', category: 'Antifungal (Topical)' },
  { generic: 'Silver Sulfadiazine', brands: ['Silverex'], strengths: ['1%'], form: 'Topical Cream', category: 'Antibiotic (Topical)' },
  { generic: 'Betamethasone', brands: ['Betnovate'], strengths: ['0.1%'], form: 'Topical Cream', category: 'Corticosteroid (Topical)' },

  { generic: 'Xylocaine (Lignocaine)', brands: ['Xylocaine'], strengths: ['2%'], form: 'Injection', category: 'Local Anesthetic' },
  { generic: 'Bupivacaine', brands: ['Sensorcaine'], strengths: ['0.5%'], form: 'Injection', category: 'Local Anesthetic' },
  { generic: 'Chlorhexidine Mouthwash', brands: ['Hexidine'], strengths: ['0.2%'], form: 'Mouthwash', category: 'Antiseptic' },
  { generic: 'Povidone Iodine', brands: ['Betadine'], strengths: ['5%', '10%'], form: 'Topical Solution', category: 'Antiseptic' },
]


export function searchMedicineReference(query, maxResults = 8) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const results = []
  for (const med of MEDICINE_REFERENCE) {
    const haystack = [med.generic, ...(med.brands || [])].join(' ').toLowerCase()
    if (!haystack.includes(q)) continue
    for (const strength of med.strengths) {
      results.push({
        id: `${med.generic}-${strength}-${med.form}`,
        name: med.brands && med.brands.length > 0 ? `${med.generic} (${med.brands.join(', ')})` : med.generic,
        dosage: `${strength} ${med.form}`,
        category: med.category
      })
      if (results.length >= maxResults) return results
    }
  }
  return results
}
