#!/usr/bin/env python3
import csv, io, json, re, urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
schools_doc=json.loads((ROOT/'data/schools.json').read_text())
events=schools_doc.get('schools',[])

ALIASES={
  "Royal Grammar School High Wycombe":["The Royal Grammar School, High Wycombe","Royal Grammar School, High Wycombe","The Royal Grammar School"],
  "Haberdashers' Boys' School":["Haberdashers' Boys' School","Haberdashers' Boys School","Haberdashers' Aske's Boys' School"],
  "Berkhamsted Boys":["Berkhamsted School"],
  "St Paul's School":["St Paul's School"],
  "St Margaret's School":["St Margaret's School","St Margaret's School, Bushey"],
  "Merchant Taylors' School":["Merchant Taylors' School","Merchant Taylors School"],
  "Mill Hill School":["Mill Hill School","Mill Hill Schools","Mill Hill School Foundation"],
  "John Lyon School":["The John Lyon School","John Lyon School"],
  "Winchester College":["Winchester College"],
  "Westminster School":["Westminster School"],
  "Harrow School":["Harrow School"],
  "Queen Elizabeth's School, Barnet":["Queen Elizabeth's School, Barnet","Queen Elizabeth's School"],
  "St Olave's Grammar School":["St Olave's and St Saviour's Grammar School","St Olave's Grammar School"],
  "Queens' School":["Queens' School"],
  "Wallington County Grammar School":["Wallington County Grammar School"],
  "Salvatorian College":["Salvatorian Roman Catholic College","Salvatorian College"],
  "Haberdashers' Boys' School":["Haberdashers' Boys' School","Haberdashers' Boys School","Haberdashers' Aske's Boys' School"],
}

URN_OVERRIDES={
  "Mill Hill School":"101367",
  "Salvatorian College":"138458",
}
URN_TO_TRACKED={urn:name for name,urn in URN_OVERRIDES.items()}

DATASETS={
  'ks4_performance': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/5b3d308c-da72-467f-b2ef-ab77d576a455/csv',
  'ks4_subjects': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/49abed18-1c61-489f-afc0-11f501335da1/csv',
  'alevel_performance': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/eb2322e3-5976-42f2-ae83-900f26e92bd9/csv',
  'alevel_subjects': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/9a275c77-4325-4ac8-aa9e-b1a2bd3ab63b/csv',
  'characteristics': 'https://content.explore-education-statistics.service.gov.uk/api/releases/420ab305-b770-4dfa-89a0-ac899f34ac46/files/3d6359e3-0733-4a4c-a829-66aec003966d',
  'sen': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/c5490fd8-6cf3-469e-9f60-0b4262134cb5/csv',
  'absence': 'https://explore-education-statistics.service.gov.uk/data-catalogue/data-set/889f9166-e3bf-4d3a-afb2-d86e4aecc70a/csv',
}

def norm(s):
    s=(s or '').lower().replace('&','and')
    s=re.sub(r"[^a-z0-9]+"," ",s)
    return ' '.join(s.split())

def n(v):
    if v is None:return None
    s=str(v).strip()
    if not s or s.lower() in {'z','x','c','na','n/a','suppressed','-'}:return None
    try:return float(s)
    except:return None

def i(v):
    x=n(v)
    return int(x) if x is not None else None

def school_groups():
    groups={}
    for e in events:
        name=e['name']
        g=groups.setdefault(name,{'name':name,'eventIds':[],'type':e.get('type'),'area':e.get('area'),'journey':e.get('journey')})
        g['eventIds'].append(e['id'])
    return list(groups.values())

groups=school_groups()
candidate_to_group={}
for g in groups:
    names=[g['name'],*ALIASES.get(g['name'],[])]
    for name in names:candidate_to_group[norm(name)]=g['name']

results={g['name']:{
  'name':g['name'],'eventIds':g['eventIds'],'type':g['type'],'area':g['area'],'journey':g['journey'],
  'urn':None,'officialName':None,'gcse':{},'alevel':{},'ks4Eal':{},'gcseSubjects':[],'alevelSubjects':[],
  'context':{'pupilCharacteristics':{},'sen':{},'absence':{}},
  'coverage':{'gcse':'Official DfE institution data currently exposed for 2022/23–2024/25.','alevel':'Official DfE institution data currently exposed for 2021/22–2024/25.','context':'Whole-school pupil characteristics and SEN use the 2025/26 January census; absence uses full academic-year school-level data through 2024/25.'}
} for g in groups}

def open_csv(url):
    print('Downloading',url,flush=True)
    req=urllib.request.Request(url,headers={'User-Agent':'Openday school-performance refresh/1.0'})
    raw=urllib.request.urlopen(req,timeout=180)
    return csv.DictReader(io.TextIOWrapper(raw,encoding='utf-8-sig',newline=''))

def total_ks4(row):
    return all((row.get(k,'Total') or 'Total')=='Total' for k in ['breakdown_topic','breakdown','sex','disadvantage_status','first_language','prior_attainment','mobility'])

# KS4 performance, including school matching and 3-year history.
for row in open_csv(DATASETS['ks4_performance']):
    tracked=URN_TO_TRACKED.get(str(row.get('school_urn') or '')) or candidate_to_group.get(norm(row.get('school_name')))
    if not tracked: continue
    item=results[tracked]
    item['urn']=row.get('school_urn') or item['urn']
    item['officialName']=row.get('school_name') or item['officialName']
    year=str(row.get('time_period') or '')
    if total_ks4(row):
        item['gcse'][year]={
          'pupils':i(row.get('pupil_count')),
          'attainment8':n(row.get('attainment8_average')),
          'progress8':n(row.get('progress8_average')),
          'progress8Lower':n(row.get('progress8_lower_95_ci')),
          'progress8Upper':n(row.get('progress8_upper_95_ci')),
          'englishMaths5Plus':n(row.get('engmath_95_percent')),
          'englishMaths4Plus':n(row.get('engmath_94_percent')),
          'ebaccEntry':n(row.get('ebacc_entering_percent')),
          'ebaccAPS':n(row.get('ebacc_aps_average')),
          'grade9to7AllGCSE':n(row.get('gcse_91_percent')),
          'tripleScienceEntry':n(row.get('sci_triple_entering_percent')),
        }
    elif (row.get('breakdown_topic') or '').lower()=='first language':
        label=' '.join([row.get('breakdown',''),row.get('first_language','')]).lower()
        if 'additional' in label or 'other than english' in label or 'not english' in label:
            item['ks4Eal'][year]=n(row.get('pupil_percent'))

urn_to_name={str(v['urn']):k for k,v in results.items() if v.get('urn')}

# KS4 subject detail for latest year. Keep raw published grade counts and suppress nothing ourselves.
subject_acc={}
for row in open_csv(DATASETS['ks4_subjects']):
    tracked=URN_TO_TRACKED.get(str(row.get('school_urn') or '')) or urn_to_name.get(str(row.get('school_urn') or ''))
    if not tracked: continue
    subject=(row.get('subject') or '').strip()
    if not subject or subject.lower()=='all subjects': continue
    key=(tracked,subject,row.get('qualification_type') or row.get('qualification_detailed') or '')
    rec=subject_acc.setdefault(key,{'subject':subject,'qualification':key[2],'pupils':i(row.get('pupil_count')),'grades':{}})
    grade=(row.get('grade') or '').strip()
    val=i(row.get('number_achieving'))
    if grade and val is not None:rec['grades'][grade]=val
for (tracked,_,_),rec in subject_acc.items():
    results[tracked]['gcseSubjects'].append(rec)
for item in results.values():
    item['gcseSubjects'].sort(key=lambda x:x['subject'])

# A-level performance history.
for row in open_csv(DATASETS['alevel_performance']):
    tracked=urn_to_name.get(str(row.get('school_urn') or '')) or candidate_to_group.get(norm(row.get('school_name')))
    if not tracked: continue
    item=results[tracked]
    item['urn']=row.get('school_urn') or item['urn']
    item['officialName']=row.get('school_name') or item['officialName']
    if (row.get('disadvantage_status') or 'Total')!='Total': continue
    if (row.get('exam_cohort') or '').lower()!='a level': continue
    year=str(row.get('time_period') or '')
    item['alevel'][year]={
      'students':i(row.get('end1618_student_count')),
      'aps':n(row.get('aps_per_entry')),
      'averageGrade':None if (row.get('aps_per_entry_grade') or '').lower() in {'','z','x'} else row.get('aps_per_entry_grade'),
      'valueAdded':n(row.get('value_added')),
      'valueAddedLower':n(row.get('value_added_lower_ci')),
      'valueAddedUpper':n(row.get('value_added_upper_ci')),
      'best3APS':n(row.get('best_three_alevels_aps')),
      'best3Grade':None if (row.get('best_three_alevels_grade') or '').lower() in {'','z','x'} else row.get('best_three_alevels_grade'),
      'aabPercent':n(row.get('aab_percent')),
      'retainedPercent':n(row.get('retained_percent')),
    }

# A-level subject detail (latest year).
alevel_acc={}
for row in open_csv(DATASETS['alevel_subjects']):
    tracked=urn_to_name.get(str(row.get('school_urn') or '')) or candidate_to_group.get(norm(row.get('school_name')))
    if not tracked: continue
    if (row.get('exam_cohort') or '').lower()!='a level': continue
    subject=(row.get('subject') or '').strip()
    if not subject or subject.lower()=='all subjects': continue
    key=(tracked,subject)
    rec=alevel_acc.setdefault(key,{'subject':subject,'grades':{}})
    grade=(row.get('grade') or '').strip()
    val=i(row.get('entries_count'))
    if grade and val is not None:rec['grades'][grade]=val
for (tracked,_),rec in alevel_acc.items():
    results[tracked]['alevelSubjects'].append(rec)
for item in results.values():
    item['alevelSubjects'].sort(key=lambda x:x['subject'])


# Whole-school pupil characteristics, January 2026 census.
for row in open_csv(DATASETS['characteristics']):
    tracked=urn_to_name.get(str(row.get('urn') or '')) or URN_TO_TRACKED.get(str(row.get('urn') or ''))
    if not tracked: continue
    item=results[tracked]
    item['context']['pupilCharacteristics']={
      'year':'2025/26',
      'headcount':i(row.get('headcount of pupils')),
      'fsmCount':i(row.get('number of pupils known to be eligible for free school meals')),
      'fsmPercent':n(row.get('% of pupils known to be eligible for free school meals')),
      'ealCount':i(row.get('number of pupils whose first language is known or believed to be other than English')),
      'ealPercent':n(row.get('% of pupils whose first language is known or believed to be other than English')),
      'englishFirstLanguagePercent':n(row.get('% of pupils whose first language is known or believed to be English')),
      'youngCarerCount':i(row.get('number of pupils who are a young carer')),
      'youngCarerPercent':n(row.get('% of pupils who are a young carer')),
      'phase':row.get('phase_type_grouping') or None,
      'admissionsPolicy':row.get('admissions_policy') or None,
    }

# School-level SEN provision, January 2026 census. Use "All pupils" primary-need rows to avoid double counting needs.
sen_acc={}
for row in open_csv(DATASETS['sen']):
    tracked=urn_to_name.get(str(row.get('school_urn') or '')) or URN_TO_TRACKED.get(str(row.get('school_urn') or ''))
    if not tracked or (row.get('sen_primary_need') or '')!='All pupils': continue
    rec=sen_acc.setdefault(tracked,{'year':'2025/26','totalPupils':None,'senSupportCount':None,'ehcpCount':None})
    provision=(row.get('sen_provision') or '').strip()
    count=i(row.get('pupil_count'))
    if provision=='All pupils':rec['totalPupils']=count
    elif provision=='SEN support':rec['senSupportCount']=count
    elif provision=='Education, health and care plans':rec['ehcpCount']=count
for tracked,rec in sen_acc.items():
    total=rec.get('totalPupils')
    support=rec.get('senSupportCount')
    ehcp=rec.get('ehcpCount')
    rec['senSupportPercent']=round(100*support/total,1) if total and support is not None else None
    rec['ehcpPercent']=round(100*ehcp/total,1) if total and ehcp is not None else None
    rec['anySenCount']=(support or 0)+(ehcp or 0) if support is not None or ehcp is not None else None
    rec['anySenPercent']=round(100*rec['anySenCount']/total,1) if total and rec['anySenCount'] is not None else None
    results[tracked]['context']['sen']=rec

# Accredited full-year school absence history. Independent schools are outside this school-level absence series.
for row in open_csv(DATASETS['absence']):
    tracked=urn_to_name.get(str(row.get('school_urn') or '')) or URN_TO_TRACKED.get(str(row.get('school_urn') or ''))
    if not tracked: continue
    year=str(row.get('time_period') or '')
    if not year: continue
    results[tracked]['context']['absence'][year]={
      'enrolments':i(row.get('enrolments')),
      'overallAbsencePercent':n(row.get('sess_overall_percent')),
      'authorisedAbsencePercent':n(row.get('sess_authorised_percent')),
      'unauthorisedAbsencePercent':n(row.get('sess_unauthorised_percent')),
      'persistentAbsencePercent':n(row.get('enrolments_pa_10_exact_percent')),
      'severeAbsencePercent':n(row.get('enrolments_pa_50_exact_percent')),
    }

# Add an explicit five-school-year display window with transparent gaps.
for item in results.values():
    item['gcseFiveYearWindow']=[
      {'year':'2020/21','status':'No comparable GCSE school-performance series; pandemic grading/disruption.'},
      {'year':'2021/22','status':'Legacy school-level series not included in the current DfE institution API; backfill separately if needed.'},
      {'year':'2022/23','data':item['gcse'].get('202223')},
      {'year':'2023/24','data':item['gcse'].get('202324')},
      {'year':'2024/25','data':item['gcse'].get('202425')},
    ]
    item['alevelWindow']=[
      {'year':'2021/22','data':item['alevel'].get('202122')},
      {'year':'2022/23','data':item['alevel'].get('202223')},
      {'year':'2023/24','data':item['alevel'].get('202324')},
      {'year':'2024/25','data':item['alevel'].get('202425')},
    ]

out={
  'generatedAt':datetime.now(timezone.utc).isoformat(),
  'methodology':{
    'gcse':'DfE Explore Education Statistics, Key stage 4 institution-level schools performance; official school data from 2022/23 to 2024/25.',
    'gcseSubjects':'DfE 2024/25 institution-level subject entries and grades.',
    'alevel':'DfE Explore Education Statistics, 16–18 institution performance, A level cohort, 2021/22 to 2024/25.',
    'alevelSubjects':'DfE 2024/25 institution-level A-level subject entries and grades.',
    'eal':'Whole-school EAL is the January 2026 school-census percentage whose first language is known or believed to be other than English. KS4 EAL is retained separately for historical exam-cohort context.',
    'fsm':'Whole-school FSM is the January 2026 percentage of pupils known to be eligible for free school meals.',
    'sen':'SEN support and EHCP percentages are calculated from the DfE 2025/26 school-level SEN census using the All pupils rows.',
    'absence':'Absence and persistent absence use the DfE accredited full academic-year school-level absence series through 2024/25. Independent schools are outside this series.',
    'progress8':'DfE does not publish Progress 8 for 2024/25 or 2025/26 because those cohorts lack KS2 baseline assessments after COVID disruption.',
    'comparability':'Independent and state-school results may be present in the same DfE performance-table datasets, but intake/selectivity and curriculum differ; do not treat raw attainment as a like-for-like school-effect measure.'
  },
  'sources':DATASETS,
  'schools':list(results.values())
}
(ROOT/'data/performance.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
matched=sum(1 for x in results.values() if x.get('urn'))
print(f'Wrote performance.json: matched {matched}/{len(results)} tracked schools')
for x in results.values():
    if not x.get('urn'):print('UNMATCHED:',x['name'])
