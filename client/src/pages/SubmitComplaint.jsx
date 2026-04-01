import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import CustomSelect from '../components/CustomSelect';

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    lat: null,
    lng: null,
    language: 'en',
    media: []
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const incomingImages = files.filter(f => f.type.startsWith('image/'));
    const incomingVideos = files.filter(f => f.type.startsWith('video/'));
    
    const currImages = form.media.filter(f => f.type.startsWith('image/')).length;
    const currVideos = form.media.filter(f => f.type.startsWith('video/')).length;
    
    if (currImages + incomingImages.length > 3) {
      setError('Maximum 3 photos allowed.'); return;
    }
    if (currVideos + incomingVideos.length > 1) {
      setError('Maximum 1 video allowed.'); return;
    }
    
    const valid = files.filter(f => {
      if(f.type.startsWith('image/') && f.size > 5 * 1024 * 1024) return false;
      if(f.type.startsWith('video/') && f.size > 50 * 1024 * 1024) return false;
      return true;
    });
    
    if (valid.length !== files.length) {
      setError('Some files exceeded size limits (5MB photo, 50MB video).');
    } else {
      setError('');
    }
    setForm(f => ({ ...f, media: [...f.media, ...valid] }));
  };

  const removeFile = (idx) => {
    setForm(f => ({ ...f, media: f.media.filter((_, i) => i !== idx) }));
  };

  const captureLocation = () => {
    setError(''); // clear any previous errors
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          setForm(f => ({ ...f, lat, lng }));
          
          // Reverse Geocoding to get address text
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();
            if (data && data.display_name) {
              // Extract a shorter, friendlier location string
              const addr = data.address;
              const shortLoc = [addr.suburb, addr.city_district, addr.city || addr.town || addr.village].filter(Boolean).join(', ') || data.display_name;
              setForm(f => ({ ...f, location: shortLoc }));
            }
          } catch (e) {
            console.warn('Reverse geocoding failed', e);
          }
        },
        (err) => setError('Geolocation failed: ' + err.message + '. Please ensure location permissions are granted in your browser settings.'),
        { enableHighAccuracy: true }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!form.title.trim() || !form.description.trim()) {
        setError('Please fill in title and description');
        return;
      }
      if (form.description.trim().length < 10) {
        setError('Description is too short (minimum 10 characters)');
        return;
      }

      setError(''); setAnalyzing(true);
      try {
        const analysis = await api.analyzeComplaint(form.description);
        
        if (analysis.isGibberish) {
          setError(analysis.error || 'Your description is too short or unclear. Please provide more details.');
          setAnalyzing(false);
          return;
        }

        setAiAnalysis(analysis);
        if (analysis.categories && analysis.categories.length > 0) {
          setForm(f => ({ ...f, category: analysis.categories[0].department }));
        } else {
          setForm(f => ({ ...f, category: 'General' }));
        }
        setStep(1);
      } catch (e) {
        const msg = e.response?.data?.error || e.message;
        // e.status is now available thanks to our api.js update
        if (e.status === 422 || e.response?.status === 422) {
          setError(msg);
          // Stay on Step 0 if it's a validation/gibberish error
        } else {
          console.warn('AI Analysis failed, falling back to manual', e);
          setAiAnalysis({ categories: [], method: 'fallback-manual' });
          setStep(1); 
        }
      } finally {
        setAnalyzing(false);
      }
    } else if (step === 1) {
      if (!form.category || !form.location.trim()) {
        setError('Please select category and specify location');
        return;
      }
      setError('');
      setStep(2);
    }
  };

  const [duplicateInfo, setDuplicateInfo] = useState(null); // { existingTicketId }

  const handleSubmit = async () => {
    setLoading(true); setError(''); setDuplicateInfo(null);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('location', form.location);
      if (form.lat) fd.append('lat', form.lat);
      if (form.lng) fd.append('lng', form.lng);
      fd.append('language', form.language);
      form.media.forEach(f => fd.append('media', f));

      const res = await api.createComplaint(fd);
      navigate(`/complaints/${res.id}?submitted=1`);
    } catch (e) {
      const data  = e.response?.data || {};
      if (data.isDuplicate) {
        setDuplicateInfo({ existingTicketId: data.existingTicketId });
      } else {
        setError(data.error || e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{t('submit.title')}</h1>
        <p>Step {step + 1} of 3: {step === 0 ? t('submit.step1') : step === 1 ? t('submit.step2') : t('submit.step3')}</p>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Stepper */}
          <div className="stepper-container" style={s.stepper}>
            {[0, 1, 2].map(i => (
              <div key={i} className="step-item" style={{ ...s.stepItem, opacity: step >= i ? 1 : 0.5 }}>
                <div style={{ ...s.stepDot, ...(step === i ? s.stepActive : step > i ? s.stepDone : {}) }}>
                  {step > i ? '✓' : i + 1}
                </div>
                <div className="step-label" style={{ ...s.stepLabel, color: step === i ? 'var(--text-main)' : 'var(--text-mist)' }}>
                  {i === 0 ? 'Basic info' : i === 1 ? 'Category' : 'Summary'}
                </div>
                {i < 2 && <div className="step-line" style={s.stepLine} />}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '24px' }}>
            {error && <div style={{ ...s.error, marginBottom: '20px' }}>{error}</div>}

            {/* Duplicate complaint notice */}
            {duplicateInfo && (
              <div style={{
                background: 'rgba(255,153,51,0.08)',
                border: '1px solid rgba(255,153,51,0.4)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--saffron)', fontSize: '0.95rem' }}>
                      Duplicate Complaint Detected
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      A similar issue at this location has already been reported within the last 7 days.
                      Your concern has been noted and the original complaint has been flagged for priority review.
                    </div>
                  </div>
                </div>
                {duplicateInfo.existingTicketId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-mist)', fontWeight: 600 }}>Existing ticket:</span>
                    <span style={{
                      fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem',
                      color: 'var(--saffron)', background: 'rgba(255,153,51,0.12)',
                      padding: '2px 10px', borderRadius: '6px'
                    }}>
                      {duplicateInfo.existingTicketId}
                    </span>
                    <button
                      onClick={() => navigate(`/track?id=${duplicateInfo.existingTicketId}`)}
                      style={{
                        background: 'var(--saffron)', color: 'var(--navy)',
                        border: 'none', borderRadius: '8px', padding: '4px 14px',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Track →
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 0 && (
              <div style={s.form} className="fade-up">
                <h2 style={s.stepTitle}>{t('submit.step1')}</h2>
                <div style={s.field}>
                  <label style={s.label}>{t('submit.issue_title')}</label>
                  <input className="input" placeholder="e.g. Pothole on Sector 5 Main Road" value={form.title} onChange={update('title')} />
                  <span style={s.hint}>A short, descriptive headline</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>{t('submit.issue_desc')}</label>
                  <textarea className="input" rows={5} placeholder="Provide as much detail as possible…" value={form.description} onChange={update('description')} style={{ resize: 'none' }} />
                  <span style={s.hint}>Our AI will use this to automatically categorize your complaint</span>
                </div>
                <div style={s.field}>
                  <label style={s.label}>{t('submit.upload_evidence')}</label>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={handleFileChange} className="input" style={{ padding: '8px' }} />
                  <span style={s.hint}>Max 3 photos (5MB each) and 1 video (50MB). Formats: JPG, PNG, WEBP, MP4, MOV.</span>
                  
                  {form.media.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {form.media.map((file, i) => (
                        <div key={i} style={{ background: 'var(--snow)', border: '1px solid var(--fog)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                          <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600 }}>&times;</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={s.actions}>
                  <button className="btn btn-primary" onClick={handleNext} disabled={analyzing}>
                    {analyzing ? 'AI Analyzing…' : t('submit.next')}
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div style={s.form} className="fade-up">
                <h2 style={s.stepTitle}>{t('submit.step2')}</h2>
                
                {aiAnalysis && aiAnalysis.categories && aiAnalysis.categories.length > 0 && (
                  <div style={s.aiBox}>
                    🤖 AI suggests: <strong>{aiAnalysis.categories[0].department}</strong> ({Math.round(aiAnalysis.categories[0].confidence * 100)}% confidence)
                  </div>
                )}

                <div style={s.field}>
                  <label style={s.label}>Department / Category</label>
                  <CustomSelect 
                    className="input" 
                    value={form.category} 
                    onChange={update('category')}
                    placeholder="Select a category…"
                    options={[
                      { label: 'Water Supply', value: 'Water Supply' },
                      { label: 'Roads & Infrastructure', value: 'Roads & Infrastructure' },
                      { label: 'Sanitation', value: 'Sanitation' },
                      { label: 'Electricity', value: 'Electricity' },
                      { label: 'Public Safety', value: 'Public Safety' },
                      { label: 'Health Services', value: 'Health Services' },
                      { label: 'Education', value: 'Education' },
                      { label: 'Transport', value: 'Transport' }
                    ]}
                  />
                </div>

                <div style={s.field}>
                  <label style={s.label}>Location / Ward</label>
                  <input className="input" placeholder="e.g. Rohini Sector 7, Ward 12" value={form.location} onChange={update('location')} />
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      type="button" 
                      onClick={captureLocation} 
                      className="btn-location-detect"
                      style={{ 
                        background: 'rgba(255,153,51,0.05)', 
                        border: '1px solid var(--border-color)', 
                        padding: '10px 20px', 
                        borderRadius: '12px', 
                        fontSize: '0.9rem', 
                        color: 'var(--saffron)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        transition: 'all 0.3s ease',
                        fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={e => { 
                        e.currentTarget.style.background = 'rgba(255,153,51,0.15)'; 
                        e.currentTarget.style.borderColor = 'var(--saffron)'; 
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,153,51,0.2)';
                      }}
                      onMouseLeave={e => { 
                        e.currentTarget.style.background = 'rgba(255,153,51,0.05)'; 
                        e.currentTarget.style.borderColor = 'var(--border-color)'; 
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                      }}
                    >
                      <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>📍</span> 
                      Detect my location
                    </button>
                    {form.lat && <span style={{ fontSize: '0.75rem', color: 'var(--green-india)', fontWeight: 600 }}>✓ Coordinates captured</span>}
                  </div>
                </div>

                <div style={s.field}>
                  <label style={s.label}>Preferred Language</label>
                  <CustomSelect 
                    className="input" 
                    value={form.language} 
                    onChange={update('language')}
                    options={[
                      { label: 'English (default)', value: 'en' },
                      { label: 'Hindi (हिन्दी)', value: 'hi' },
                      { label: 'Marathi (मराठी)', value: 'mr' }
                    ]}
                  />
                </div>

                <div style={s.actions}>
                  <button className="btn btn-ghost" onClick={() => setStep(0)}>{t('submit.back')}</button>
                  <button className="btn btn-primary" onClick={handleNext}>{t('submit.next')}</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={s.form} className="fade-up">
                <h2 style={s.stepTitle}>{t('submit.step3')}</h2>
                <div style={s.review}>
                  <div style={s.reviewRow}><span style={s.reviewKey}>Subject</span><span style={s.reviewVal}>{form.title}</span></div>
                  <div style={s.reviewRow}><span style={s.reviewKey}>Category</span><span style={s.reviewVal}><strong>{form.category}</strong></span></div>
                  <div style={s.reviewRow}><span style={s.reviewKey}>Area</span><span style={s.reviewVal}>{form.location}</span></div>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--fog)' }}>
                    <div style={{ ...s.reviewKey, marginBottom: '6px' }}>Description</div>
                    <div style={{ ...s.reviewVal, lineHeight: 1.6 }}>{form.description}</div>
                  </div>
                  {form.media.length > 0 && (
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ ...s.reviewKey, marginBottom: '6px' }}>Attachments</div>
                      <div style={s.reviewVal}>{form.media.length} file(s) attached</div>
                    </div>
                  )}
                </div>

                <div style={s.aiNote}>
                  ℹ️ Our AI engine has verified this complaint format for clarity. It will be assigned to a field officer within 4 hours (SLA P2).
                </div>

                <div style={s.actions}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading}>{t('submit.back')}</button>
                  <button className="btn btn-saffron" onClick={handleSubmit} disabled={loading} style={{ minWidth: '140px', justifyContent: 'center' }}>
                    {loading ? 'Submitting…' : t('submit.submit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .step-label { display: none; }
          .step-item { max-width: 60px !important; }
          .stepper-container { gap: 10px !important; }
          .step-line { display: block !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  stepper:{display:'flex',alignItems:'center',justifyContent:'center',gap:'0',marginBottom:'32px'},
  stepItem:{display:'flex',alignItems:'center',gap:'8px',flex:1,maxWidth:'200px'},
  stepDot:{width:'28px',height:'28px',borderRadius:'50%',background:'var(--bg-card)',color:'var(--text-mist)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'0.8rem',flexShrink:0,borderWidth:'1px',borderStyle:'solid',borderColor:'var(--border-color)'},
  stepActive:{background:'var(--saffron)',color:'#fff',borderColor:'var(--saffron)'},
  stepDone:{background:'var(--green-india)',color:'#fff',borderColor:'var(--green-india)'},
  stepLabel:{fontSize:'0.8rem',fontWeight:500,whiteSpace:'nowrap'},
  stepLine:{flex:1,height:'2px',background:'var(--border-color)',margin:'0 4px'},
  form:{display:'flex',flexDirection:'column',gap:'18px'},
  stepTitle:{fontFamily:'Rajdhani,sans-serif',fontSize:'1.25rem',color:'var(--text-main)',marginBottom:'4px'},
  field:{display:'flex',flexDirection:'column',gap:'6px'},
  label:{fontSize:'0.8rem',fontWeight:600,color:'var(--text-dim)'},
  hint:{fontSize:'0.75rem',color:'var(--text-mist)'},
  actions:{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'},
  review:{background:'var(--bg-body)',borderRadius:'var(--radius)',border:'1px solid var(--border-color)',overflow:'hidden',display:'flex',flexDirection:'column'},
  reviewRow:{display:'flex',gap:'12px',padding:'10px 14px',borderBottom:'1px solid var(--border-color)',flexWrap:'wrap'},
  reviewKey:{width:'100px',fontSize:'0.8rem',color:'var(--text-mist)',fontWeight:600,flexShrink:0},
  reviewVal:{fontSize:'0.875rem',color:'var(--text-main)',flex:1,minWidth:'200px'},
  aiNote:{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:'var(--radius)',padding:'12px',fontSize:'0.85rem',color:'var(--text-dim)',lineHeight:1.6},
  aiBox:{background:'var(--bg-card)',border:'1px solid var(--green-india)',borderRadius:'var(--radius)',padding:'10px 14px',fontSize:'0.85rem',color:'var(--green-india)',marginBottom:'16px'},
  error:{background:'rgba(192,57,43,0.1)',border:'1px solid rgba(192,57,43,0.3)',color:'var(--red)',padding:'9px 13px',borderRadius:'var(--radius)',fontSize:'0.85rem'},
};


