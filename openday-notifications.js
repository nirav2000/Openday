import {createNotifications,mountRecipientPreferences,mountNotificationInbox,notificationStyles} from 'https://nirav2000.github.io/Apps/notifications/v1/index.js';

const APP='openday',SCOPE='planning',USER='planner';
const EVENT_TYPES=[
  {id:'open_event.new',label:'New open day / visit found'},
  {id:'open_event.changed',label:'Open event date or time changed'},
  {id:'booking.changed',label:'Booking availability changed'},
  {id:'award.updated',label:'Scholarship / bursary information updated'},
  {id:'deadline.approaching',label:'Admissions or award deadline approaching'}
];
const read=()=>{try{return JSON.parse(localStorage.getItem('openDayState')||'{}')}catch{return{}}};
const write=data=>{data.updatedAt=new Date().toISOString();localStorage.setItem('openDayState',JSON.stringify(data));window.OpenDaySync?.schedule?.()};
const defaults=()=>({
  policy:{policyOwnerId:USER,costBearerId:USER,allowedChannels:{in_app:true,web_push:false,email:false,telegram:false,whatsapp:false,signal:false,slack:false,discord:false,sms:false,ios_push:false},allowedEvents:Object.fromEntries(EVENT_TYPES.map(x=>[x.id,true])),mandatoryEvents:{}},
  preferences:{channels:{in_app:true},events:Object.fromEntries(EVENT_TYPES.map(x=>[x.id,true])),destinations:{}},
  inbox:[]
});
function notificationState(){const state=read(),base=defaults(),saved=state.notificationState||{};return{state,value:{...base,...saved,policy:{...base.policy,...(saved.policy||{})},preferences:{...base.preferences,...(saved.preferences||{})},inbox:Array.isArray(saved.inbox)?saved.inbox:[]}}}
function saveValue(value){const {state}=notificationState();state.notificationState=value;write(state);return value}
const transport={
  async policy(){return notificationState().value.policy},
  async savePolicy(scope,policy){const {value}=notificationState();value.policy=policy;saveValue(value);return policy},
  async preferences(){return notificationState().value.preferences},
  async savePreferences(scope,userId,preferences){const {value}=notificationState();value.preferences=preferences;saveValue(value);return preferences},
  async inbox(scope,userId,{limit=50}={}){return notificationState().value.inbox.slice(0,limit)},
  async markRead(scope,userId,id){const {value}=notificationState(),item=value.inbox.find(x=>x.id===id);if(item)item.read=true;saveValue(value);return item||null},
  async unreadCount(){return notificationState().value.inbox.filter(x=>x.read!==true).length},
  async emit(event){const {value}=notificationState(),prefs=value.preferences||{},allowed=value.policy?.allowedEvents?.[event.type]!==false,wants=prefs.events?.[event.type]!==false;if(allowed&&wants){value.inbox=[{...event,storedAt:new Date().toISOString(),read:false},...value.inbox.filter(x=>x.id!==event.id)].slice(0,100);saveValue(value)}return{ok:true,inApp:allowed&&wants}},
  async readiness(){return{version:1,scopeId:SCOPE,core:{status:'ready',detail:'Shared Notifications v1.1 loaded'},inApp:{status:'ready',detail:'Openday private-state inbox installed'},production:{status:'ready',detail:'Thin Openday private-state transport installed'},providers:{web_push:{status:'setup-required',configured:false,approved:true,detail:'Openday does not yet have an authenticated server transport for FCM registration/delivery.'}}}}
};
const client=createNotifications({app:APP,transport,eventTypes:EVENT_TYPES.map(x=>x.id)});
let modalsReady=false;
function ensureStyle(){if(document.getElementById('opendayNotificationStyles'))return;const style=document.createElement('style');style.id='opendayNotificationStyles';style.textContent=notificationStyles()+'.notification-ready-note{margin:10px 0;padding:10px;border-radius:10px;background:#eef7ff;color:#36566c}.apps-notification-preferences h2{font-size:1.05rem}.apps-notification-inbox{margin-top:18px}';document.head.appendChild(style)}
async function refresh(){
  ensureStyle();const button=document.getElementById('notificationsButton'),dialog=document.getElementById('notificationsDialog');if(!button||!dialog)return;
  const unread=await client.unreadCount(SCOPE,USER);button.textContent=unread?'🔔 '+unread:'🔔';button.title=unread?unread+' unread notification'+(unread===1?'':'s'):'Notifications';
  if(!modalsReady){dialog.onclick=e=>{if(e.target===dialog||e.target.hasAttribute('data-close-notifications'))dialog.close()};button.onclick=async()=>{dialog.showModal();await mount()};modalsReady=true}
}
async function mount(){
  const prefs=document.getElementById('notificationPreferences'),inbox=document.getElementById('notificationInbox'),status=document.getElementById('notificationReadiness');
  await mountRecipientPreferences(prefs,{client,scopeId:SCOPE,userId:USER,role:'owner',eventTypes:EVENT_TYPES,respectReadiness:true,visibleChannels:['in_app','web_push']});
  await mountNotificationInbox(inbox,{client,scopeId:SCOPE,userId:USER,onUnreadChange:()=>refresh()});
  status.textContent='In-app notifications are installed and stored with Openday private state. Browser push is intentionally shown as setup required until Openday has an authenticated server transport; no provider credentials are exposed in the browser.';
}
window.OpenDayNotifications={client,events:EVENT_TYPES,emit:(type,payload)=>client.emit(type,{scopeId:SCOPE,actorId:USER,recipients:[USER],...payload}).then(x=>{refresh();return x})};
window.addEventListener('openday:cloud-state',()=>refresh());
refresh();
