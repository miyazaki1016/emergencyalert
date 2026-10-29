'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase/browser';
export default function DeveloperLabLink(){
 const [allowed,setAllowed]=useState(false);
 useEffect(()=>{let alive=true,generation=0,timer:ReturnType<typeof setTimeout>|undefined;
  const check=async()=>{const rid=++generation;try{const client=getSupabaseBrowserClient(),{data}=await client.auth.getUser();if(!alive||rid!==generation)return;if(!data.user){setAllowed(false);return;}const member=await client.from('rain_research_admins').select('owner_id').eq('owner_id',data.user.id).eq('enabled',true).maybeSingle();if(alive&&rid===generation)setAllowed(Boolean(!member.error&&member.data));}catch{if(alive&&rid===generation)setAllowed(false);}};
  const refresh=()=>{generation++;setAllowed(false);if(timer)clearTimeout(timer);timer=setTimeout(()=>void check(),0);};
  let unsubscribe:()=>void=()=>{};try{const sub=getSupabaseBrowserClient().auth.onAuthStateChange(refresh);unsubscribe=()=>sub.data.subscription.unsubscribe();}catch{}
  void check();window.addEventListener('amefuru:auth-ready',refresh);return()=>{alive=false;generation++;if(timer)clearTimeout(timer);unsubscribe();window.removeEventListener('amefuru:auth-ready',refresh);};
 },[]);
 return allowed?<a href='/dev/rain-lab' style={{display:'inline-block',marginTop:24,color:'#c8e9e7',fontSize:13}}>開発者専用 · 雨の判定ラボ →</a>:null;
}
