import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { ds } from "../constants/design";
import { Btn, Spinner, BrandLogo } from "./ui";

export function AuthModal({onClose,onSuccess}){
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [ok,setOk]=useState("");
  const inp={width:"100%",padding:"11px 14px",border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.md,fontSize:14,outline:"none",fontFamily:ds.font.body,color:ds.color.textDark,boxSizing:"border-box",background:"#fff",transition:"border-color 0.15s"};

  const handleSubmit=async()=>{
    setError("");setOk("");setLoading(true);
    try{
      if(mode==="login"){
        const cred=await signInWithEmailAndPassword(auth,email,pw);
        onSuccess(cred.user);
      }else if(mode==="signup"){
        if(!name.trim()){setError("Please enter your name.");setLoading(false);return;}
        const cred=await createUserWithEmailAndPassword(auth,email,pw);
        await setDoc(doc(db,"customers",cred.user.uid),{
          name:name.trim(),email:email.toLowerCase(),createdAt:serverTimestamp(),
          totalOrders:0,totalSpent:0,points:0,savedAddress:"",wishlist:[],
        });
        onSuccess(cred.user);
      }else{
        await sendPasswordResetEmail(auth,email);
        setOk("Password reset email sent! Check your inbox.");
      }
    }catch(e){
      const msgs={"auth/user-not-found":"No account found with that email.","auth/wrong-password":"Incorrect password.","auth/email-already-in-use":"Email already registered. Please log in.","auth/weak-password":"Password must be at least 6 characters.","auth/invalid-email":"Please enter a valid email address.","auth/invalid-credential":"Incorrect email or password."};
      setError(msgs[e.code]||"Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(26,20,16,0.55)",padding:20}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:ds.radius.xl,padding:"40px 36px",maxWidth:420,width:"100%",boxShadow:ds.shadow.lg,animation:"modalIn .25s ease",position:"relative"}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",fontSize:20,color:ds.color.textMuted,cursor:"pointer",lineHeight:1}}>✕</button>
        <div style={{textAlign:"center",marginBottom:28}}>
          <BrandLogo height={36}/>
          <div style={{fontFamily:ds.font.display,fontSize:22,color:ds.color.textDark,marginTop:16,marginBottom:4}}>
            {mode==="login"?"Welcome back":mode==="signup"?"Create your account":"Reset password"}
          </div>
          <div style={{fontSize:13,color:ds.color.textMuted}}>
            {mode==="login"?"Sign in to your DMEAST account":mode==="signup"?"Join DMEAST to track orders and earn rewards":"We'll send a reset link to your email"}
          </div>
        </div>
        {error&&<div style={{background:ds.color.redLight,border:`1px solid ${ds.color.redBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.red,marginBottom:16}}>{error}</div>}
        {ok&&<div style={{background:ds.color.successBg,border:`1px solid ${ds.color.successBorder}`,borderRadius:ds.radius.md,padding:"10px 14px",fontSize:13,color:ds.color.success,marginBottom:16}}>{ok}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="signup"&&(
            <div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
            </div>
          )}
          <div>
            <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border}/>
          </div>
          {mode!=="forgot"&&(
            <div>
              <label style={{fontSize:12.5,fontWeight:600,color:ds.color.textDark,display:"block",marginBottom:6}}>Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder={mode==="signup"?"At least 6 characters":"Your password"} style={inp} onFocus={e=>e.target.style.borderColor=ds.color.red} onBlur={e=>e.target.style.borderColor=ds.color.border} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}
        </div>
        {mode==="login"&&<button onClick={()=>{setMode("forgot");setError("");setOk("");}} style={{background:"none",border:"none",fontSize:12.5,color:ds.color.red,cursor:"pointer",marginTop:8,padding:0}}>Forgot password?</button>}
        <div style={{marginTop:22}}>
          <Btn variant="primary" size="lg" fullWidth disabled={loading} onClick={handleSubmit}>
            {loading?<><Spinner size={16} color="#fff"/>&nbsp;{mode==="login"?"Signing in…":mode==="signup"?"Creating account…":"Sending…"}</>:mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Email"}
          </Btn>
        </div>
        <div style={{textAlign:"center",marginTop:18,fontSize:13,color:ds.color.textMuted}}>
          {mode==="login"&&<><span>Don't have an account? </span><button onClick={()=>{setMode("signup");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>Sign up</button></>}
          {mode==="signup"&&<><span>Already have an account? </span><button onClick={()=>{setMode("login");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>Sign in</button></>}
          {mode==="forgot"&&<button onClick={()=>{setMode("login");setError("");setOk("");}} style={{background:"none",border:"none",color:ds.color.red,fontWeight:600,cursor:"pointer",fontSize:13}}>← Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}

