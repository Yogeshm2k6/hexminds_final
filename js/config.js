/**
 * HexaMinds — Environment & Configuration Manager
 * Loads environment settings for Cloudinary, Firebase Firestore, and Biometrics Backend.
 */
(function() {
  'use strict';

  var defaultConfig = {
    // Cloudinary Media Storage
    CLOUDINARY: {
      cloudName: "etwi6mr1",
      apiKey: "851528631193376",
      apiSecret: "0Ykrn3mdG8rQ19Z78Vq1qzs6YMs",
      uploadUrl: "https://api.cloudinary.com/v1_1/etwi6mr1"
    },
    // Firebase Firestore Configuration
    FIREBASE: {
      apiKey: "AIzaSyDaeHuep_eGqLSIxoOMOO4kjbjOcI4cLNg",
      authDomain: "examportal-a4795.firebaseapp.com",
      projectId: "examportal-a4795",
      storageBucket: "examportal-a4795.firebasestorage.app",
      messagingSenderId: "863213436052",
      appId: "1:863213436052:web:3fec0db8245a0446a8c881",
      measurementId: "G-VSY3NHC3PJ"
    },
    // InsightFace ArcFace Biometrics Backend
    BIOMETRICS: {
      baseUrl: "https://hexminds-final-backend.onrender.com",
      registerEndpoint: "/api/biometrics/register",
      verifyEndpoint: "/api/biometrics/verify",
      healthEndpoint: "/api/biometrics/health"
    }
  };

  // Expose globally
  window.HM_CONFIG = defaultConfig;
  window.ENV = {
    CLOUDINARY_CLOUD_NAME: defaultConfig.CLOUDINARY.cloudName,
    CLOUDINARY_API_KEY: defaultConfig.CLOUDINARY.apiKey,
    CLOUDINARY_API_SECRET: defaultConfig.CLOUDINARY.apiSecret,
    FIREBASE_API_KEY: defaultConfig.FIREBASE.apiKey,
    FIREBASE_PROJECT_ID: defaultConfig.FIREBASE.projectId,
    BIOMETRICS_URL: defaultConfig.BIOMETRICS.baseUrl
  };

  // Optional: dynamically parse .env if accessible via fetch (e.g. on web server)
  try {
    if (typeof fetch === 'function' && window.location.protocol.indexOf('http') === 0) {
      fetch('.env')
        .then(function(res) {
          if (res.ok) return res.text();
          return null;
        })
        .then(function(text) {
          if (!text) return;
          var lines = text.split('\n');
          lines.forEach(function(line) {
            line = line.trim();
            if (!line || line.indexOf('#') === 0) return;
            var parts = line.split('=');
            if (parts.length >= 2) {
              var key = parts[0].trim();
              var val = parts.slice(1).join('=').trim();
              window.ENV[key] = val;
              if (key === 'CLOUDINARY_CLOUD_NAME') {
                window.HM_CONFIG.CLOUDINARY.cloudName = val;
                window.HM_CONFIG.CLOUDINARY.uploadUrl = "https://api.cloudinary.com/v1_1/" + val;
              } else if (key === 'CLOUDINARY_API_KEY') {
                window.HM_CONFIG.CLOUDINARY.apiKey = val;
              } else if (key === 'CLOUDINARY_API_SECRET') {
                window.HM_CONFIG.CLOUDINARY.apiSecret = val;
              } else if (key === 'FIREBASE_API_KEY') {
                window.HM_CONFIG.FIREBASE.apiKey = val;
              } else if (key === 'FIREBASE_PROJECT_ID') {
                window.HM_CONFIG.FIREBASE.projectId = val;
              } else if (key === 'BIOMETRICS_SERVICE_URL') {
                window.HM_CONFIG.BIOMETRICS.baseUrl = val.replace(/\/+$/, '');
                window.ENV.BIOMETRICS_URL = val.replace(/\/+$/, '');
              }
            }
          });
          console.log("✓ Loaded environment settings from .env");
        })
        .catch(function() {
          // Defaults already active
        });
    }
  } catch(e) {}

  // Global Biometrics Endpoint Helper
  window.getBiometricsBaseUrl = function() {
    if (window.HM_CONFIG && window.HM_CONFIG.BIOMETRICS && window.HM_CONFIG.BIOMETRICS.baseUrl) {
      return window.HM_CONFIG.BIOMETRICS.baseUrl.replace(/\/+$/, '');
    }
    if (window.ENV && window.ENV.BIOMETRICS_URL) {
      return window.ENV.BIOMETRICS_URL.replace(/\/+$/, '');
    }
    return "https://hexminds-final-backend.onrender.com";
  };

  // Client-Side Keep-Alive & Health Monitor
  window.HM_BIOMETRICS_HEALTH = {
    isOnline: false,
    modelRunning: false,
    latencyMs: null,
    lastCheck: null,
    modelName: null,
    error: null
  };

  window.pingBiometricsBackend = function(callback) {
    var baseUrl = window.getBiometricsBaseUrl();
    var healthUrl = baseUrl + "/api/biometrics/health?test=false";
    var startTime = Date.now();

    fetch(healthUrl, { method: "GET", cache: "no-store" })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(result) {
        var elapsed = Date.now() - startTime;
        var data = result.data || {};
        var isModelUp = !!(data.model && data.model.running);

        window.HM_BIOMETRICS_HEALTH = {
          isOnline: true,
          modelRunning: isModelUp,
          latencyMs: elapsed,
          lastCheck: new Date(),
          modelName: (data.model && data.model.name) || "ArcFace",
          data: data,
          error: isModelUp ? null : (data.model && data.model.error)
        };

        if (isModelUp) {
          console.log("✓ [HexaMinds Biometrics Engine] ONLINE & MODEL RUNNING (" + elapsed + "ms) — Buffalo_SC ArcFace 512-D");
        } else {
          console.warn("⚠ [HexaMinds Biometrics Engine] Online but model degraded:", data.model);
        }

        if (typeof callback === 'function') callback(window.HM_BIOMETRICS_HEALTH);
      })
      .catch(function(err) {
        window.HM_BIOMETRICS_HEALTH = {
          isOnline: false,
          modelRunning: false,
          latencyMs: null,
          lastCheck: new Date(),
          error: err.message
        };
        console.warn("ℹ [HexaMinds Biometrics] Backend waking up or offline. Client fallback active (" + err.message + ")");
        if (typeof callback === 'function') callback(window.HM_BIOMETRICS_HEALTH);
      });
  };

  // Immediately ping backend 1 second after page load to warm up Render container
  if (typeof window !== 'undefined') {
    setTimeout(function() {
      window.pingBiometricsBackend();
    }, 1200);

    // Keep backend alive by pinging every 4.5 minutes (270,000 ms) while student/admin has tab open
    setInterval(function() {
      window.pingBiometricsBackend();
    }, 270000);
  }
})();
