#!/usr/bin/env python3
import json, math, re, urllib.parse, urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'data/primary-schools.json'
doc=json.loads(PATH.read_text())
schools=doc.get('schools',[])

ORIGIN_POSTCODE='UB5 6QX'
ORIGIN_EASTING=511287
ORIGIN_NORTHING=184166
RADIUS_MILES=5.0
M_PER_MILE=1609.344

def norm(s):
    return re.sub(r'[^a-z0-9]+',' ',(s or '').lower()).strip()

def host(url):
    if not url:return ''
    u=url if '://' in url else 'https://'+url
    try:return urlparse(u).netloc.lower().removeprefix('www.')
    except:return ''

def web(url):
    if not url:return ''
    return url if url.startswith(('http://','https://')) else 'https://'+url

def distance(a):
    try:
        dx=float(a.get('easting'))-ORIGIN_EASTING
        dy=float(a.get('northing'))-ORIGIN_NORTHING
        return round(math.hypot(dx,dy)/M_PER_MILE,2)
    except:return None

where="establishmentstatus__name_='Open' AND phaseofeducation__name_ IN ('Primary','All-through')"
params={
 'f':'json','where':where,
 'outFields':'urn,establishmentname,postcode,schoolwebsite,town,phaseofeducation__name_,typeofestablishment__name_,easting,northing,statutorylowage,statutoryhighage',
 'returnGeometry':'false','resultRecordCount':'3000'
}
url='https://gis.london.gov.uk/arcgis/rest/services/apps/ESOL_webmap/MapServer/3/query?'+urllib.parse.urlencode(params)
req=urllib.request.Request(url,headers={'User-Agent':'Openday primary-radius refresh/1.0'})
features=json.load(urllib.request.urlopen(req,timeout=90)).get('features',[])
rows=[f.get('attributes',{}) for f in features]

by_name={}
by_host={}
for row in rows:
    by_name.setdefault(norm(row.get('establishmentname')),[]).append(row)
    h=host(row.get('schoolwebsite'))
    if h:by_host.setdefault(h,[]).append(row)

used_urns=set()
for s in schools:
    matches=by_name.get(norm(s.get('name')),[])
    h=host(s.get('infoUrl'))
    if not matches and h:matches=by_host.get(h,[])
    if len(matches)==1:
        row=matches[0]
        d=distance(row)
        s['urn']=str(row.get('urn') or s.get('urn') or '') or None
        s['postcode']=row.get('postcode') or s.get('postcode')
        s['distanceMiles']=d
        s['distanceFromPostcode']=ORIGIN_POSTCODE
        if s.get('urn'):used_urns.add(s['urn'])

new=[]
for row in rows:
    urn=str(row.get('urn') or '')
    d=distance(row)
    low=int(float(row.get('statutorylowage') or 99))
    high=int(float(row.get('statutoryhighage') or 0))
    typ=str(row.get('typeofestablishment__name_') or '')
    # Add Reception-capable mainstream schools in the 5-mile search ring.
    if not urn or d is None or d>RADIUS_MILES or low>4 or high<7:
        continue
    if 'special' in typ.lower() or 'pupil referral' in typ.lower():
        continue
    if urn in used_urns:
        continue
    name=(row.get('establishmentname') or '').strip()
    site=web(row.get('schoolwebsite'))
    area=(row.get('town') or '').strip() or 'London'
    independent='independent' in typ.lower()
    new.append({
      'id':'primary-'+urn,
      'name':name,
      'area':area,
      'postcode':row.get('postcode') or None,
      'urn':urn,
      'distanceMiles':d,
      'distanceFromPostcode':ORIGIN_POSTCODE,
      'infoUrl':site,
      'bookingUrl':site,
      'type':'independent' if independent else 'state',
      'entry':'Reception',
      'event':'Reception open day / school tour',
      'start':None,
      'end':None,
      'lastKnownStart':None,
      'status':'research',
      'bookingRequired':None,
      'priority':3,
      'journey':None,
      'note':f'Added from the London school-location register because it is approximately {d:g} miles straight-line from {ORIGIN_POSTCODE}. Current Reception 2027 tour/open-event details are being researched on the school website.'
    })
    used_urns.add(urn)

schools.extend(new)
# Stable default display: nearest first when source data is inspected directly.
schools.sort(key=lambda s:(s.get('distanceMiles') is None, s.get('distanceMiles',999), s.get('name','')))
doc['schools']=schools
doc.setdefault('meta',{})
doc['meta'].update({
  'updated':'2026-09-29',
  'travelOrigin':ORIGIN_POSTCODE,
  'radiusMiles':RADIUS_MILES,
  'distanceMethod':'Straight-line distance from the postcode centroid using OS National Grid eastings/northings; use live route links for road/public-transport journey distance.',
  'originCoordinates':{'easting':ORIGIN_EASTING,'northing':ORIGIN_NORTHING,'latitude':51.545427,'longitude':-0.396527},
  'coverage':f'Existing researched primary catalogue plus open Reception-capable London primary/all-through schools within {RADIUS_MILES:g} miles of {ORIGIN_POSTCODE}.',
  'locationSource':'Greater London Authority London Schools map service / DfE establishment attributes.',
  'note':'The primary catalogue is centred on UB5 6QX. Nearby schools are added by radius even when they cross borough boundaries; open-event dates continue to be researched from each school’s own admissions/tours pages.'
})
PATH.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+'\n')
print('Primary schools:',len(schools),'new radius schools:',len(new))
bands=[1,2,3,5]
for b in bands:
    print('within',b,'miles:',sum(1 for s in schools if isinstance(s.get('distanceMiles'),(int,float)) and s['distanceMiles']<=b))
