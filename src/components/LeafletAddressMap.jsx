import { useState, useEffect, useRef } from "react";
import { ds } from "../constants/design";
import { Spinner } from "./ui";

export function LeafletAddressMap({ initialAddress, onAddressChange, onCoordsChange }){
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(!!window.L);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pinnedCoords, setPinnedCoords] = useState(null);

  const DEFAULT_CENTER = [14.5995, 120.9842];
  const DEFAULT_ZOOM = 13;

  // Load Leaflet script from CDN
  useEffect(() => {
    if (window.L) { setScriptLoaded(true); return; }
    const existing = document.querySelector('script[src*="leaflet.js"]');
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Map failed to load. Please refresh the page.");
    document.head.appendChild(script);
  }, []);

  // Initialize map after script loads AND container is sized
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstanceRef.current || !window.L) return;
    const L = window.L;

    const initMap = () => {
      const el = mapRef.current;
      if (!el || el.clientWidth === 0 || el.clientHeight === 0) {
        setTimeout(initMap, 100);
        return;
      }
      const map = L.map(el, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      marker.bindPopup("📍 Drag me or click the map to set delivery location").openPopup();
      markerRef.current = marker;

      const reverseGeocode = async (lat, lng) => {
        setGeocoding(true);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name && onAddressChange) onAddressChange(data.display_name);
          if (onCoordsChange) onCoordsChange({ lat, lng });
          setPinnedCoords({ lat, lng });
        } catch (e) { console.warn("Reverse geocode failed:", e); }
        setGeocoding(false);
      };

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;

      // CRITICAL FIX: Call invalidateSize multiple times to force tile recalculation
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 300);
      setTimeout(() => map.invalidateSize(), 600);
    };
    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [scriptLoaded]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current && window.L) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          markerRef.current.setLatLng([latitude, longitude]);
          markerRef.current.bindPopup("📍 Your current location").openPopup();
          mapInstanceRef.current.invalidateSize();
          setGeocoding(true);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name && onAddressChange) onAddressChange(data.display_name);
            if (onCoordsChange) onCoordsChange({ lat: latitude, lng: longitude });
            setPinnedCoords({ lat: latitude, lng: longitude });
          } catch(e) {}
          setGeocoding(false);
        }
        setLocating(false);
      },
      (err) => {
        setError("Could not get your location. Please drop a pin manually on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchAddress = async () => {
    if (!searchInput.trim()) return;
    setGeocoding(true); setError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&countrycodes=ph&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat), lngNum = parseFloat(lon);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latNum, lngNum], 16);
          markerRef.current.setLatLng([latNum, lngNum]);
          mapInstanceRef.current.invalidateSize();
        }
        if (onAddressChange) onAddressChange(display_name);
        if (onCoordsChange) onCoordsChange({ lat: latNum, lng: lngNum });
        setPinnedCoords({ lat: latNum, lng: lngNum });
      } else {
        setError("Address not found. Try a different search or drop a pin manually.");
      }
    } catch(e) { setError("Search failed. Please try again."); }
    setGeocoding(false);
  };

  return (
    <div style={{border:`1.5px solid ${ds.color.border}`,borderRadius:ds.radius.lg,overflow:"hidden",background:"#fff"}}>
      <div style={{padding:"12px 14px",background:ds.color.canvas,borderBottom:`1px solid ${ds.color.border}`}}>
        <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
          <button type="button" onClick={useMyLocation} disabled={locating||!scriptLoaded}
            style={{padding:"8px 14px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.red}`,background:ds.color.redLight,cursor:locating?"wait":"pointer",fontSize:12.5,fontWeight:700,color:ds.color.red,fontFamily:ds.font.body,display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
            {locating?"⏳ Locating…":"📍 Use My Location"}
          </button>
        </div>
        <div style={{display:"flex",gap:6}}>
          <input type="text" value={searchInput} onChange={e=>setSearchInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();searchAddress();}}}
            placeholder="🔍 Search address (e.g. SM Manila, BGC Taguig)"
            style={{flex:1,padding:"8px 12px",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.sm,fontSize:13,fontFamily:ds.font.body,outline:"none",background:"#fff",minWidth:0}}/>
          <button type="button" onClick={searchAddress} disabled={geocoding||!scriptLoaded}
            style={{padding:"8px 16px",borderRadius:ds.radius.sm,border:`1px solid ${ds.color.border}`,background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:ds.color.textBody,whiteSpace:"nowrap"}}>
            Search
          </button>
        </div>
      </div>
      <div style={{position:"relative",width:"100%",height:320,background:ds.color.canvas}}>
        {!scriptLoaded&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,background:ds.color.canvas}}>
            <div style={{textAlign:"center"}}>
              <Spinner size={28}/>
              <div style={{marginTop:10,fontSize:12,color:ds.color.textMuted}}>Loading map…</div>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{position:"absolute",top:0,left:0,right:0,bottom:0,width:"100%",height:"100%"}}/>
        {geocoding&&scriptLoaded&&(
          <div style={{position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.95)",border:`1px solid ${ds.color.border}`,borderRadius:ds.radius.md,padding:"6px 10px",fontSize:11,color:ds.color.textMuted,zIndex:1000,display:"flex",alignItems:"center",gap:6,boxShadow:ds.shadow.sm}}>
            <Spinner size={12}/> Locating address…
          </div>
        )}
      </div>
      <div style={{padding:"10px 14px",fontSize:11.5,color:ds.color.textMuted,background:ds.color.canvas,borderTop:`1px solid ${ds.color.borderLight}`}}>
        💡 <strong>Tip:</strong> Click anywhere on the map or drag the pin to set your exact delivery location.
        {pinnedCoords&&(<div style={{marginTop:6,color:ds.color.success,fontWeight:600}}>✓ Pinned: {pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}</div>)}
      </div>
      {error&&<div style={{padding:"8px 14px",fontSize:12,color:ds.color.red,background:ds.color.redLight,borderTop:`1px solid ${ds.color.redBorder}`}}>⚠ {error}</div>}
    </div>
  );
}

