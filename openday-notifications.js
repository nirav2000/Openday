import {createNotifications,mountNotificationInbox,notificationStyles,registerConsumerWebPush,webPushPublicConfig} from 'https://nirav2000.github.io/Apps/notifications/v1/index.js';

const APP='openday',SCOPE='planning',USER='planner',PUSH_API='https://apps-monitor-api.nirav2000-github.workers.dev';
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
  policy:{policyOwnerId:USER,costBearerId:USER,allowedChannels:{in_app:true,web_push:true,email:false,telegram:false,whatsapp:false,signal:false,slack:false,discord:false,sms:false,ios_push:false},allowedEvents:Object.fromEntries(EVENT_TYPES.map(x=>[x.id,true])),mandatoryEvents:{}},
  preferences:{channels:{in_app:true,web_push:false},events:Object.fromEntries(EVENT_TYPES.map(x=>[x.id,true])),destinations:{}},
  inbox:[],
  activation:{presentedAt:'',choice:'',permission:'default',testShown:false}
});
function notificationState(){
  const state=read(),base=defaults(),saved=state.notificationState||{};
  return{state,value:{...base,...saved,policy:{...base.policy,...(saved.policy||{})},preferences:{...base.preferences,...(saved.preferences||{}),channels:{...base.preferences.channels,...(saved.preferences?.channels||{})},events:{...base.preferences.events,...(saved.preferences?.events||{})}},inbox:Array.isArray(saved.inbox)?saved.inbox:[],activation:{...base.activation,...(saved.activation||{})}}}
}
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
  async readiness(){return{version:1,scopeId:SCOPE,core:{status:'ready'},inApp:{status:'ready'},production:{status:'partial'},providers:{web_push:{status:pushPermission()==='granted'?'permission-ready':'user-action-required',configured:false,approved:true}}}}
};
const client=createNotifications({app:APP,transport,eventTypes:EVENT_TYPES.map(x=>x.id)});
let modalsReady=false;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent||'');
const standalone=()=>navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)')?.matches===true;
const pushPermission=()=>('Notification'in window?Notification.permission:'unsupported');
const supportsPush=()=>('Notification'in window)&&('serviceWorker'in navigator);

function ensureStyle(){
  if(document.getElementById('opendayNotificationStyles'))return;
  const style=document.createElement('style');style.id='opendayNotificationStyles';
  style.textContent=notificationStyles()+`
    .consumer-notification-card{border:1px solid #d8e5ee;background:#f7fbfe;border-radius:14px;padding:14px;margin:10px 0}
    .consumer-notification-card h3{margin:0 0 6px}.consumer-notification-card p{margin:5px 0;color:#516a7d;line-height:1.45}
    .consumer-notification-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
    .consumer-notification-actions button{border:1px solid #c7d5df;border-radius:10px;background:#fff;padding:9px 12px;font:inherit;font-weight:800}
    .consumer-notification-actions .primary{background:#1769aa;color:#fff;border-color:#1769aa}
    .notification-event-list{display:grid;gap:8px;margin:12px 0}.notification-event-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e2e9ee;border-radius:10px;background:#fff}
    .notification-event-row input{width:20px;height:20px}.notification-status{font-size:.85rem;color:#61758a;line-height:1.45;margin-top:8px}
  `;
  document.head.appendChild(style)
}
function saveActivation(patch){
  const {value}=notificationState();value.activation={...value.activation,...patch};saveValue(value)
}
async function showTestNotification(){
  if(pushPermission()!=='granted'||!('serviceWorker'in navigator))return false;
  try{
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification('Openday notifications enabled',{body:'You can now receive iPhone notifications from Openday.',tag:'openday-enabled',data:{url:location.href}});
    saveActivation({testShown:true});return true;
  }catch{return false}
}
async function enableNotifications(){
  const status=document.getElementById('notificationActivationStatus');
  if(isIOS()&&!standalone()){
    status.textContent='On iPhone, web push works from an installed Home Screen app. Add Openday to your Home Screen, open it there, then enable notifications.';
    saveActivation({choice:'needs-install'});return
  }
  if(!supportsPush()){
    status.textContent='This browser does not support web notifications for this app.';
    saveActivation({choice:'unsupported',permission:'unsupported'});return
  }
  try{
    status.textContent='Requesting notification permission…';
    const config=await webPushPublicConfig(PUSH_API+'/notifications/public-config?app='+encodeURIComponent(APP));
    if(!config?.consumerRegistration||!config?.webPush?.configured){status.textContent='Openday remote notifications are not available from the shared service yet.';return}
    const enabledEvents=EVENT_TYPES.filter(x=>notificationState().value.preferences.events?.[x.id]!==false).map(x=>x.id);
    const result=await registerConsumerWebPush({apiBase:PUSH_API,app:APP,eventTypes:enabledEvents,firebaseConfig:config.webPush.firebaseConfig,vapidKey:config.webPush.vapidKey});
    if(!result.ok){status.textContent='Push was not enabled: '+String(result.reason||'registration failed');return}
    const {value}=notificationState();value.preferences.channels.web_push=true;value.preferences.destinations=value.preferences.destinations||{};value.preferences.destinations.fcmInstallationId=result.installationId;value.activation={...value.activation,choice:'enabled',permission:'granted',remoteRegistered:true,registeredAt:new Date().toISOString()};saveValue(value);
    status.textContent='Enabled ✓ This iPhone is registered with the Openday notification service.';
    await mount();
  }catch(error){status.textContent='Could not enable remote notifications: '+String(error?.message||error)}
}
async function sendRemoteTest(){
  const status=document.getElementById('notificationActivationStatus');
  status.textContent='Your device is registered for remote push. A remote test must be sent by the trusted notification backend; the app itself cannot send notifications to subscribers.';
  return false
}
function activationHtml(){
  const {value}=notificationState(),a=value.activation,permission=pushPermission();
  const enabled=permission==='granted';
  const iOSNeedsInstall=isIOS()&&!standalone();
  let title='Enable notifications',body='Get alerts for new open days, changed dates, booking availability and scholarship or bursary updates.';
  if(enabled){title='iPhone notifications enabled';body='Openday has permission to show notifications on this device.'}
  else if(iOSNeedsInstall){title='Install Openday for iPhone notifications';body='Apple allows web push for Home Screen web apps. Add Openday to your Home Screen, open the installed app, then enable notifications.'}
  return '<section class="consumer-notification-card"><h3>'+title+'</h3><p>'+body+'</p><div class="consumer-notification-actions">'+
    (enabled?'<button id="sendNotificationTest" type="button">Send test notification</button>':iOSNeedsInstall?'<button id="notificationInstallHelp" class="primary" type="button">How to add to Home Screen</button>':'<button id="enableNotifications" class="primary" type="button">Enable notifications</button>')+
    (!enabled&&!iOSNeedsInstall?'<button id="notNowNotifications" type="button">Not now</button>':'')+
    '</div><div id="notificationActivationStatus" class="notification-status">'+(a.choice==='denied'?'Previously denied on this device.':'')+'</div></section>'
}
async function renderConsumerPreferences(root){
  const prefs=await client.preferences(SCOPE,USER);
  root.innerHTML=activationHtml()+'<h3>Notify me about</h3><div class="notification-event-list">'+EVENT_TYPES.map(item=>'<label class="notification-event-row"><span>'+item.label+'</span><input type="checkbox" data-event="'+item.id+'" '+(prefs.events?.[item.id]!==false?'checked':'')+'></label>').join('')+'</div>';
  root.querySelector('#enableNotifications')?.addEventListener('click',enableNotifications);
  root.querySelector('#notNowNotifications')?.addEventListener('click',()=>{saveActivation({choice:'not-now'});document.getElementById('notificationActivationStatus').textContent='You can enable notifications later from the bell.'});
  root.querySelector('#sendNotificationTest')?.addEventListener('click',sendRemoteTest);
  root.querySelector('#notificationInstallHelp')?.addEventListener('click',()=>{document.getElementById('notificationActivationStatus').textContent='In Safari: Share → Add to Home Screen. Then open Openday from its Home Screen icon.'});
  root.querySelectorAll('[data-event]').forEach(box=>box.addEventListener('change',async()=>{const next=await client.preferences(SCOPE,USER);next.events[box.dataset.event]=box.checked;await client.savePreferences(SCOPE,USER,next)}));
}
async function refresh(){
  ensureStyle();const button=document.getElementById('notificationsButton'),dialog=document.getElementById('notificationsDialog');if(!button||!dialog)return;
  const unread=await client.unreadCount(SCOPE,USER);button.textContent=unread?'🔔 '+unread:'🔔';button.title=unread?unread+' unread notification'+(unread===1?'':'s'):'Notifications';
  if(!modalsReady){dialog.onclick=e=>{if(e.target===dialog||e.target.hasAttribute('data-close-notifications'))dialog.close()};button.onclick=async()=>{dialog.showModal();await mount()};modalsReady=true}
}
async function mount(){
  const prefs=document.getElementById('notificationPreferences'),inbox=document.getElementById('notificationInbox'),status=document.getElementById('notificationReadiness');
  await renderConsumerPreferences(prefs);
  await mountNotificationInbox(inbox,{client,scopeId:SCOPE,userId:USER,onUnreadChange:()=>refresh()});
  status.textContent='No Google or Firebase account is required. When enabled, this device is registered with the shared Openday push service.';
}
function maybePromptOnOpen(){
  const {value}=notificationState(),a=value.activation;
  if(a.presentedAt)return;
  saveActivation({presentedAt:new Date().toISOString()});
  setTimeout(async()=>{const dialog=document.getElementById('notificationsDialog');if(!dialog?.open){dialog.showModal();await mount()}},900)
}
window.OpenDayNotifications={client,events:EVENT_TYPES,emit:(type,payload)=>client.emit(type,{scopeId:SCOPE,actorId:USER,recipients:[USER],...payload}).then(x=>{refresh();return x}),enable:enableNotifications,test:showTestNotification};
window.addEventListener('openday:cloud-state',()=>refresh());
refresh();maybePromptOnOpen();
