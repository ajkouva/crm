import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "nav": {
        "home": "Home",
        "dashboard": "Dashboard",
        "file_complaint": "File Complaint",
        "login": "Login",
        "logout": "Logout",
        "track": "Track"
      },
      "home": {
        "hero_title_1": "Smart Governance for",
        "hero_title_2": "Smarter Citizens",
        "hero_subtitle": "Empowering every citizen with an AI-powered grievance redressal engine. Transparent, accountable, and lightning-fast resolution at your fingertips.",
        "file_now": "File a Complaint",
        "track_status": "Transparency Portal",
        "stats_resolved": "Resolved Successfully",
        "stats_avg_time": "Avg. Resolution Time"
      },
      "submit": {
        "title": "Submit Complaint",
        "step1": "What's the issue?",
        "step2": "Classification",
        "step3": "Review & Submit",
        "issue_title": "Complaint Title",
        "issue_desc": "Detailed Description",
        "upload_evidence": "Upload Evidence (Photos/Videos)",
        "next": "Next Step →",
        "back": "Back",
        "submit": "Confirm & Submit"
      },
      "complaint": {
        "status": "Status",
        "priority": "Priority",
        "department": "Department",
        "location": "Location",
        "timeline": "Timeline",
        "comments": "Comments & Notes"
      },
      "dashboard": {
        "title": "Welcome back",
        "subtitle": "Here is an overview of the system today.",
        "pending": "Pending",
        "resolved": "Resolved",
        "escalated": "Escalated",
        "sla": "SLA Compliance",
        "recent_activity": "Recent Activity",
        "quick_actions": "Quick Actions",
        "trends": "30-Day Trends"
      },
      "list": {
        "title": "Complaints",
        "search": "Search tickets...",
        "all": "All",
        "open": "Open",
        "new": "New",
        "in_progress": "In Progress",
        "resolved": "Resolved",
        "closed": "Closed"
      },
      "kanban": {
        "title": "Kanban Board",
        "subtitle": "Drag and drop complaints to update their status.",
        "new": "NEW",
        "in_progress": "IN PROGRESS",
        "resolved": "RESOLVED",
        "closed": "CLOSED"
      },
      "common": {
        "view": "View Details",
        "assign": "Assign",
        "save": "Save Changes",
        "cancel": "Cancel"
      }
    }
  },
  hi: {
    translation: {
      "nav": {
        "home": "मुख्य पृष्ठ",
        "dashboard": "डैशबोर्ड",
        "file_complaint": "शिकायत दर्ज करें",
        "login": "लॉग इन",
        "logout": "लॉग आउट",
        "track": "स्थिति देखें"
      },
      "home": {
        "hero_title_1": "इसके लिए स्मार्ट गवर्नेंस",
        "hero_title_2": "स्मार्ट नागरिक",
        "hero_subtitle": "एआई-संचालित शिकायत निवारण इंजन के साथ प्रत्येक नागरिक को सशक्त बनाना। पारदर्शी, जवाबदेह और बिजली की तेजी से आपकी उंगलियों पर समाधान।",
        "file_now": "शिकायत दर्ज करें",
        "track_status": "पारदर्शिता पोर्टल",
        "stats_resolved": "सफलतापूर्वक हल किया गया",
        "stats_avg_time": "औसत समाधान समय"
      },
      "submit": {
        "title": "शिकायत दर्ज करें",
        "step1": "समस्या क्या है?",
        "step2": "वर्गीकरण",
        "step3": "समीक्षा और जमा करें",
        "issue_title": "शिकायत का शीर्षक",
        "issue_desc": "विस्तृत विवरण",
        "upload_evidence": "सबूत अपलोड करें (फोटो/वीडियो)",
        "next": "अगला कदम →",
        "back": "वापस",
        "submit": "पुष्टि करें और जमा करें"
      },
      "complaint": {
        "status": "स्थिति",
        "priority": "प्राथमिकता",
        "department": "विभाग",
        "location": "स्थान",
        "timeline": "समयरेखा",
        "comments": "टिप्पणियाँ और नोट्स"
      },
      "dashboard": {
        "title": "वापसी पर स्वागत है",
        "subtitle": "यहां आज सिस्टम का विवरण दिया गया है।",
        "pending": "लंबित",
        "resolved": "समाधान हो गया",
        "escalated": "बढ़ाया गया",
        "sla": "SLA अनुपालन",
        "recent_activity": "हाल की गतिविधि",
        "quick_actions": "त्वरित कार्रवाइयां",
        "trends": "30-दिन के रुझान"
      },
      "list": {
        "title": "शिकायतें",
        "search": "टिकट खोजें...",
        "all": "सभी",
        "open": "खुला",
        "new": "नया",
        "in_progress": "प्रगति में",
        "resolved": "समाधान हो गया",
        "closed": "बंद"
      },
      "kanban": {
        "title": "कानबन बोर्ड",
        "subtitle": "स्थिति अपडेट करने के लिए शिकायतों को खींचें और छोड़ें।",
        "new": "नया",
        "in_progress": "प्रगति में",
        "resolved": "समाधान हो गया",
        "closed": "बंद"
      },
      "common": {
        "view": "विवरण देखें",
        "assign": "सौंपें",
        "save": "परिवर्तन सहेजें",
        "cancel": "रद्द करें"
      }
    }
  }
};


i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;


