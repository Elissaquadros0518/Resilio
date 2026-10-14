import React, { useState } from 'react';
import { CloudRain, Sun, Droplet, Hammer, AlertTriangle, Wind, Zap, HelpCircle, Locate, Camera, Image, Video, CheckCircle2, Send } from 'lucide-react';

export default function ReportIssuePage({ onAddReport }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('Vidyavihar Railway Station West');
  const [evidence, setEvidence] = useState(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSimulateAI = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiResult({
        detected: category || 'Flooding / Waterlogging',
        confidence: '92%',
        checks: [
          '✓ Location verified in Vidyavihar ward',
          '✓ Recent rainfall telemetry matched',
          '✓ Nearby peer reports corroborated',
          '✓ Evidence image appears relevant'
        ],
        finalConfidence: 'HIGH'
      });
    }, 2500);
  };

  const handleSubmitFinal = (e) => {
    e.preventDefault();
    onAddReport({
      category: category || 'Flooding / Waterlogging',
      location,
      lat: 19.0770 + (Math.random() - 0.5) * 0.005,
      lng: 72.8950 + (Math.random() - 0.5) * 0.005,
      severity: severity.toUpperCase(),
      description: description || 'Reported via community mobile app interface.',
      evidence: evidence || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80'
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Report an Issue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Help make Vidyavihar safer by reporting what you observe in your neighbourhood.</p>
      </div>

      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-8">
        
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 1: What did you observe?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { id: 'Flooding / Waterlogging', label: 'Flooding / Water', icon: CloudRain, color: 'text-skyBlue' },
              { id: 'Extreme Heat', label: 'Extreme Heat', icon: Sun, color: 'text-warmOrange' },
              { id: 'Water Shortage', label: 'Water Shortage', icon: Droplet, color: 'text-blue-500' },
              { id: 'Infrastructure Damage', label: 'Infrastructure', icon: Hammer, color: 'text-purple-500' },
              { id: 'Road Problem', label: 'Road Problem', icon: AlertTriangle, color: 'text-amber-500' },
              { id: 'Fallen Tree', label: 'Fallen Tree', icon: Wind, color: 'text-safeGreen' },
              { id: 'Power Issue', label: 'Power Issue', icon: Zap, color: 'text-criticalRed' },
              { id: 'Other', label: 'Other Issue', icon: HelpCircle, color: 'text-slate-400' }
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 ${
                    category === item.id
                      ? 'border-tealAccent bg-tealAccent/10 text-tealAccent font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-700/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <IconComp className={`w-6 h-6 ${item.color}`} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 2: Where is it located?</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter street, landmark or area in Vidyavihar"
              className="flex-1 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-tealAccent"
            />
            <button
              type="button"
              onClick={() => setLocation("Vidyavihar Station West (GPS Locked)")}
              className="bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition"
            >
              <Locate className="w-4 h-4 text-tealAccent" />
              <span>Use GPS</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 3: Add evidence & AI verification</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button 
              type="button"
              onClick={() => { setEvidence("https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80"); handleSimulateAI(); }}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Camera className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Take Photo</span>
            </button>
            <button 
              type="button"
              onClick={() => { setEvidence("https://images.unsplash.com/photo-1584467735811-9942f88cc227?auto=format&fit=crop&w=600&q=80"); handleSimulateAI(); }}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Image className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Photo</span>
            </button>
            <button 
              type="button"
              onClick={() => { setEvidence("sample_video.mp4"); handleSimulateAI(); }}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Video className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload Video</span>
            </button>
          </div>

          {isAnalyzing && (
            <div className="p-4 rounded-2xl bg-tealAccent/10 border border-tealAccent/30 flex items-center space-x-3 animate-pulse">
              <div className="w-5 h-5 rounded-full border-2 border-tealAccent border-t-transparent animate-spin"></div>
              <span className="text-sm font-bold text-tealAccent">AI Verification: Analyzing image & spatial telemetry...</span>
            </div>
          )}

          {aiResult && !isAnalyzing && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-safeGreen" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">AI Verification: {aiResult.detected}</span>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-safeGreen/15 text-safeGreen">Confidence: {aiResult.confidence}</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {aiResult.checks.map((c, i) => <div key={i}>{c}</div>)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 4: Describe the problem</label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened in detail..."
            className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-tealAccent"
          ></textarea>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 5: How severe is it?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Low', 'Moderate', 'High', 'Critical'].map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverity(sev)}
                className={`py-3.5 rounded-2xl text-xs font-bold border transition ${
                  severity === sev
                    ? sev === 'Critical' ? 'bg-criticalRed text-white border-criticalRed shadow-lg shadow-criticalRed/25' :
                      sev === 'High' ? 'bg-warmOrange text-white border-warmOrange shadow-lg shadow-warmOrange/25' :
                      'bg-tealAccent text-white border-tealAccent shadow-lg shadow-tealAccent/25'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmitFinal}
          className="w-full bg-gradient-to-r from-skyBlue via-tealAccent to-emerald-500 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-tealAccent/30 hover:opacity-95 transition flex items-center justify-center space-x-2.5 text-base"
        >
          <Send className="w-5 h-5" />
          <span>Submit Report to Community</span>
        </button>
      </div>
    </div>
  );
}