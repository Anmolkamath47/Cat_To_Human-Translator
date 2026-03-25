// Cat ↔ Human Translator App

class CatTranslator {
    constructor() {
        this.mediaRecorder = null;
        this.audioContext = null;
        this.analyser = null;
        this.recordedChunks = [];
        this.recordingInProgress = false;
        this.humanAudioBuffer = null;
        this.catAudioBuffer = null;
        this.lastAudioElement = null;
        
        this.initializeUI();
    }
    
    initializeUI() {
        // Cat to Human Controls
        document.getElementById('startRecordBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('stopRecordBtn').addEventListener('click', () => this.stopRecording());
        document.getElementById('playHumanBtn').addEventListener('click', () => this.playHumanVoice());
        
        // Human to Cat Controls
        document.getElementById('convertCatBtn').addEventListener('click', () => this.convertToCat());
        document.getElementById('playCatBtn').addEventListener('click', () => this.playCatSound());
    }
    
    // ==================== CAT TO HUMAN ====================
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                this.recordedChunks.push(e.data);
            };
            
            this.mediaRecorder.start();
            this.recordingInProgress = true;
            
            // Update UI
            document.getElementById('startRecordBtn').disabled = true;
            document.getElementById('stopRecordBtn').disabled = false;
            document.getElementById('recordingIndicator').classList.remove('hidden');
            document.getElementById('emotionOutput').textContent = 'Recording...';
            document.getElementById('translationOutput').textContent = 'Processing...';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone. Please check permissions.');
        }
    }
    
    async stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                
                // Analyze the recording
                const audioBuffer = await audioBlob.arrayBuffer();
                await this.audioContext.decodeAudioData(audioBuffer, (decodedBuffer) => {
                    const emotion = this.analyzeAudio(decodedBuffer);
                    const translation = this.emotionToSentence(emotion);
                    
                    // Update UI
                    this.updateEmotionDisplay(emotion);
                    this.updateTranslationDisplay(translation);
                    
                    // Generate speech
                    this.generateHumanVoice(translation);
                }, (error) => {
                    console.error('Error decoding audio:', error);
                    this.updateEmotionDisplay('Unknown');
                });
                
                // Stop all tracks
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                
                // Update UI
                this.recordingInProgress = false;
                document.getElementById('startRecordBtn').disabled = false;
                document.getElementById('stopRecordBtn').disabled = true;
                document.getElementById('recordingIndicator').classList.add('hidden');
                
                resolve();
            };
            
            this.mediaRecorder.stop();
        });
    }
    
    analyzeAudio(audioBuffer) {
        const data = audioBuffer.getChannelData(0);
        
        // Calculate loudness (RMS)
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        const rms = Math.sqrt(sum / data.length);
        const loudness = Math.min(rms * 10, 1);
        
        // Estimate pitch using autocorrelation
        const pitch = this.estimatePitch(data);
        
        // Duration
        const duration = audioBuffer.duration;
        
        // Analyze frequency content
        const frequencies = this.analyzeFrequencies(data);
        
        console.log('Loudness:', loudness, 'Pitch:', pitch, 'Duration:', duration, 'Frequencies:', frequencies);
        
        // Determine emotion based on analysis
        const emotion = this.classifyEmotion(loudness, pitch, duration, frequencies);
        return emotion;
    }
    
    estimatePitch(data) {
        // Simple pitch detection using autocorrelation
        const SIZE = 4096;
        const MAX_SAMPLES = Math.floor(data.length);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        
        // Compute RMS
        for (let i = 0; i < SIZE; i++) {
            const val = data[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        
        // Not enough signal
        if (rms < 0.01) return 0;
        
        // Find the best correlation offset
        let lastCorrelation = 1;
        for (let offset = 0; offset < 200; offset++) {
            let correlation = 0;
            for (let i = 0; i < SIZE; i++) {
                correlation += Math.abs(data[i] - data[i + offset]);
            }
            correlation = 1 - (correlation / SIZE);
            if (correlation > 0.9) {
                if (correlation > lastCorrelation) {
                    let foundGoodCorrelation = false;
                    if (correlation > best_correlation) {
                        best_correlation = correlation;
                        best_offset = offset;
                        foundGoodCorrelation = true;
                    }
                    if (foundGoodCorrelation) {
                        break;
                    }
                }
            }
            lastCorrelation = correlation;
        }
        
        if (best_correlation > 0.01) {
            return best_offset;
        }
        return 0;
    }
    
    analyzeFrequencies(data) {
        // Simple frequency analysis
        const SIZE = 256;
        let lowFreq = 0, midFreq = 0, highFreq = 0;
        
        for (let i = 0; i < Math.min(SIZE, data.length); i++) {
            const val = Math.abs(data[i]);
            if (i < SIZE / 3) {
                lowFreq += val;
            } else if (i < 2 * SIZE / 3) {
                midFreq += val;
            } else {
                highFreq += val;
            }
        }
        
        return { low: lowFreq / (SIZE / 3), mid: midFreq / (SIZE / 3), high: highFreq / (SIZE / 3) };
    }
    
    classifyEmotion(loudness, pitch, duration, frequencies) {
        // Simple emotion classification rules
        
        // Very loud and short = angry
        if (loudness > 0.6 && duration < 0.5) {
            return 'Angry 😾';
        }
        
        // Moderate loudness, medium pitch, longer = happy
        if (loudness > 0.3 && loudness < 0.7 && pitch > 30 && pitch < 100 && duration > 0.3) {
            return 'Happy 😸';
        }
        
        // High pitch, moderate loudness = happy/playful
        if (pitch > 80 && loudness > 0.2) {
            return 'Playful 😻';
        }
        
        // Low pitch, moderate loudness = hungry
        if (pitch < 40 && loudness > 0.3 && loudness < 0.8) {
            return 'Hungry 😹';
        }
        
        // Very low loudness = scared
        if (loudness < 0.3) {
            return 'Scared 😿';
        }
        
        // Default logic
        if (loudness > 0.7) return 'Angry 😾';
        if (loudness > 0.5) return 'Hungry 😹';
        if (loudness > 0.3 && pitch > 60) return 'Happy 😸';
        
        return 'Neutral 😺';
    }
    
    emotionToSentence(emotion) {
        const emotionMap = {
            'Angry 😾': 'Leave me alone!',
            'Happy 😸': 'I am so happy right now!',
            'Playful 😻': 'Let\'s play together!',
            'Hungry 😹': 'I am very hungry, feed me!',
            'Scared 😿': 'Something scared me, help!',
            'Neutral 😺': 'I am just chilling here.'
        };
        
        return emotionMap[emotion] || 'I am a cat';
    }
    
    updateEmotionDisplay(emotion) {
        const emotionBox = document.getElementById('emotionOutput');
        emotionBox.textContent = emotion;
        emotionBox.classList.add('detected');
    }
    
    updateTranslationDisplay(translation) {
        const translationBox = document.getElementById('translationOutput');
        translationBox.textContent = translation;
        translationBox.classList.add('filled');
    }
    
    generateHumanVoice(text) {
        // Use Web Speech API for text-to-speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Store for manual playback
        this.lastUtterance = utterance;
        
        // Enable play button
        document.getElementById('playHumanBtn').disabled = false;
        
        // Auto-play
        this.playHumanVoice();
    }
    
    playHumanVoice() {
        if (this.lastUtterance) {
            speechSynthesis.cancel();
            setTimeout(() => {
                speechSynthesis.speak(this.lastUtterance);
            }, 100);
        }
    }
    
    // ==================== HUMAN TO CAT ====================
    
    convertToCat() {
        const humanInput = document.getElementById('humanInput').value.trim();
        
        if (!humanInput) {
            alert('Please type something first!');
            return;
        }
        
        const inputLower = humanInput.toLowerCase();
        
        // Check for different emotion keywords to play real cat audio
        const hungerKeywords = ['hungry', 'feed', 'food', 'eat', 'starving', 'famished', 'want eat'];
        const happyKeywords = ['love', 'happy', 'joy', 'like', 'cute', 'playful', 'fun'];
        const angryKeywords = ['angry', 'hate', 'bad', 'mean', 'leave me', 'go away', 'hate you'];
        const scaredKeywords = ['scared', 'afraid', 'help', 'danger', 'danger', 'frightened'];
        
        let realAudioFile = null;
        let realAudioDisplay = null;
        
        if (hungerKeywords.some(keyword => inputLower.includes(keyword))) {
            realAudioFile = 'cat-angry.mpeg'; // Hungry cat sound
            realAudioDisplay = '🐱 MEOWWWW!!! (Real hungry cat sound)';
        } else if (angryKeywords.some(keyword => inputLower.includes(keyword))) {
            realAudioFile = 'cat-angry.mpeg'; // Angry cat sound
            realAudioDisplay = '😾 HISSSS!!! (Real angry cat sound)';
        } else if (happyKeywords.some(keyword => inputLower.includes(keyword))) {
            // Can add cat-happy.mpeg if available
            realAudioFile = null;
            realAudioDisplay = null;
        } else if (scaredKeywords.some(keyword => inputLower.includes(keyword))) {
            // Can add cat-scared.mpeg if available
            realAudioFile = null;
            realAudioDisplay = null;
        }
        
        // Try to play real cat audio if found
        if (realAudioFile && this.playRealCatSound(realAudioFile)) {
            document.getElementById('catSoundOutput').textContent = realAudioDisplay;
            document.getElementById('catSoundOutput').classList.add('filled');
            document.getElementById('playCatBtn').disabled = false;
            return;
        }
        
        // Fallback to synthesized sounds
        const catSounds = this.textToCatSounds(humanInput);
        document.getElementById('catSoundOutput').textContent = catSounds.display;
        document.getElementById('catSoundOutput').classList.add('filled');
        
        // Generate audio
        this.generateCatAudio(catSounds.pattern);
        
        // Enable play button
        document.getElementById('playCatBtn').disabled = false;
    }
    
    playRealCatSound(filename) {
        try {
            const audio = new Audio(filename);
            let audioLoaded = false;
            let loadAttempted = false;
            
            audio.addEventListener('canplay', () => {
                audioLoaded = true;
                audio.play().catch(err => {
                    console.log('Could not auto-play audio:', err);
                });
            });
            
            audio.addEventListener('error', (e) => {
                if (!audioLoaded && !loadAttempted) {
                    // Try alternate filename with space
                    loadAttempted = true;
                    const altFilename = filename.replace(/-/g, ' ');
                    if (altFilename !== filename) {
                        const altAudio = new Audio(altFilename);
                        altAudio.addEventListener('canplay', () => {
                            altAudio.play().catch(err => {
                                console.log('Could not play alternate audio:', err);
                            });
                        });
                        altAudio.load();
                        this.lastAudioElement = altAudio;
                        return;
                    }
                    console.log('Real cat audio not found:', filename);
                }
            });
            
            // Try to load and play
            audio.load();
            this.lastAudioElement = audio;
            return true;
        } catch (e) {
            console.log('Error with real cat sound:', e);
            return false;
        }
    }
    
    textToCatSounds(text) {
        const words = text.toLowerCase().split(/\s+/);
        let pattern = [];
        let display = '';
        
        words.forEach((word, index) => {
            const wordPattern = this.wordToCatSound(word);
            pattern.push(wordPattern.pattern);
            display += wordPattern.display + ' ';
        });
        
        return {
            pattern: pattern,
            display: '🐱 ' + display.trim()
        };
    }
    
    wordToCatSound(word) {
        const wordLength = word.length;
        const vowels = (word.match(/[aeiou]/g) || []).length;
        
        let sound = '';
        let display = '';
        
        // Map word characteristics to cat sounds
        if (word.includes('lov') || word.includes('lik') || word.includes('good')) {
            sound = 'meow';
            display = 'Mrrrow~';
        } else if (word.includes('angry') || word.includes('hate') || word.includes('bad')) {
            sound = 'hiss';
            display = 'Hisssss!';
        } else if (word.includes('hungry') || word.includes('food') || word.includes('eat')) {
            sound = 'yowl';
            display = 'Meowwww!';
        } else if (word.includes('sleep') || word.includes('tired') || word.includes('rest')) {
            sound = 'purr';
            display = 'Prrr...';
        } else if (word.includes('you') || word.includes('help') || word.includes('please')) {
            sound = 'meow';
            display = 'Meow!';
        } else if (wordLength > 5) {
            sound = 'long_meow';
            display = 'Meeeoooow...';
        } else if (vowels > 2) {
            sound = 'yowl';
            display = 'Yowwwwl!';
        } else {
            sound = 'meow';
            display = 'Meow';
        }
        
        return { pattern: sound, display: display };
    }
    
    generateCatAudio(patterns) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
        const data = audioBuffer.getChannelData(0);
        
        let sampleIndex = 0;
        
        patterns.forEach((soundType) => {
            const soundData = this.generateCatSound(soundType, audioContext.sampleRate);
            for (let i = 0; i < soundData.length && sampleIndex < data.length; i++) {
                data[sampleIndex++] = soundData[i];
            }
        });
        
        // Store for playback
        this.catAudioBuffer = audioBuffer;
    }
    
    generateCatSound(soundType, sampleRate) {
        const duration = 0.6; // seconds
        const samples = Math.floor(sampleRate * duration);
        const sound = new Float32Array(samples);
        
        switch(soundType) {
            case 'meow':
                return this.generateMeow(sound, sampleRate);
            case 'hiss':
                return this.generateHiss(sound, sampleRate);
            case 'yowl':
                return this.generateYowl(sound, sampleRate);
            case 'purr':
                return this.generatePurr(sound, sampleRate);
            case 'long_meow':
                return this.generateLongMeow(sound, sampleRate);
            default:
                return this.generateMeow(sound, sampleRate);
        }
    }
    
    generateMeow(sound, sampleRate) {
        // Realistic meow with natural pitch glissando and complex harmonics
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            // More realistic meow frequency range (real cats: ~500-2000 Hz)
            // Start higher, dip, then rise again
            let targetFreq = 800;
            if (progress < 0.2) {
                // Quick rise at start
                targetFreq = 600 + progress / 0.2 * 300;
            } else if (progress < 0.6) {
                // Natural dip in middle
                targetFreq = 900 - (progress - 0.2) / 0.4 * 200;
            } else {
                // Rise again at end
                targetFreq = 700 + (progress - 0.6) / 0.4 * 300;
            }
            
            // Add natural vibrato that increases with time
            const vibratoDepth = Math.min(progress * 80, 60);
            const vibrato = Math.sin(progress * Math.PI * 7 + Math.random() * 0.5) * vibratoDepth;
            
            // Add slight pitch instability (cats aren't perfect)
            const jitter = (Math.random() - 0.5) * 40;
            const freq = targetFreq + vibrato + jitter;
            
            const phase = 2 * Math.PI * freq * t;
            
            // Complex harmonic series for tom-like quality
            let wave = Math.sin(phase) * 0.65;
            wave += Math.sin(phase * 2) * 0.35;
            wave += Math.sin(phase * 3) * 0.22;
            wave += Math.sin(phase * 4 - Math.PI/4) * 0.12;
            
            // Add breathiness/noise component
            const noise = (Math.random() * 2 - 1) * 0.08;
            wave = wave * 0.85 + noise * 0.15;
            
            // Realistic envelope with slight peak
            let envelope = 1;
            if (progress < 0.03) {
                envelope = progress / 0.03;
            } else if (progress < 0.1) {
                envelope = 1 - (progress - 0.03) * 1.5;
            } else if (progress > 0.92) {
                envelope = (1 - progress) / 0.08;
            }
            
            sound[i] = wave * envelope * 0.27;
        }
        return sound;
    }
    
    generateHiss(sound, sampleRate) {
        // Ultra-realistic hiss - like actual cat defensive hiss
        let lastSample = 0;
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            // Multi-layer noise for realistic "shhh" sound
            let noise = Math.random() * 2 - 1;
            
            // Apply high-pass filtering multiple times for natural sibilance
            lastSample = lastSample * 0.92 + noise * 0.08;
            noise = noise - lastSample;
            
            // Add modulated high frequencies (5-12 kHz range)
            const highFreq = 7000 + Math.sin(progress * Math.PI * 2.5) * 3000;
            const highPhase = 2 * Math.PI * highFreq * t;
            const highComponent = Math.sin(highPhase) * 0.3;
            
            // Mid-range frequency for thickness (2-3 kHz)
            const midFreq = 2500 + Math.sin(progress * Math.PI * 1.8) * 500;
            const midPhase = 2 * Math.PI * midFreq * t;
            const midComponent = Math.sin(midPhase) * 0.25;
            
            // Combine components
            let wave = noise * 0.5 + highComponent * 0.3 + midComponent * 0.2;
            
            // Add slight frequency sweeps for dynamics
            if (progress > 0.3 && progress < 0.7) {
                const crackle = Math.sin(progress * Math.PI * 15) * 0.15;
                wave += crackle * (Math.random() > 0.7 ? 0.3 : 0);
            }
            
            // Evil sounding envelope
            let envelope = 1;
            if (progress < 0.02) {
                // Sharp attack
                envelope = progress / 0.02;
            } else if (progress < 0.08) {
                // Sustain with slight peek
                envelope = 1 + (progress - 0.02) * 2;
            } else if (progress > 0.72) {
                // Extended release
                envelope = (1 - progress) / 0.28;
            }
            
            sound[i] = wave * envelope * 0.22;
        }
        return sound;
    }
    
    generateYowl(sound, sampleRate) {
        // Realistic extended yowl - mournful cat call (searching/distressed)
        let lastPhase = 0;
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            // Complex pitch contour - natural speech-like movement
            let targetFreq = 450;
            if (progress < 0.15) {
                // Quick attack with rise
                targetFreq = 450 + progress / 0.15 * 200;
            } else if (progress < 0.5) {
                // Hold at peak with slight wobble
                targetFreq = 650 + Math.sin((progress - 0.15) * Math.PI * 2) * 80;
            } else if (progress < 0.8) {
                // Slow descent
                targetFreq = 650 - (progress - 0.5) / 0.3 * 150;
            } else {
                // Final rise (typical cat yowl ending)
                targetFreq = 500 + (progress - 0.8) / 0.2 * 200;
            }
            
            // Add dynamic vibrato
            const vibratoRate = 5 + progress * 3;
            const vibrato = Math.sin(progress * Math.PI * vibratoRate) * (50 + progress * 40);
            
            // Pitch jitter for natural imperfection
            const jitter = (Math.sin(t * 173.0) + Math.sin(t * 251.0)) * 30;
            
            const freq = Math.max(200, targetFreq + vibrato + jitter);
            
            // Proper phase continuity
            lastPhase += 2 * Math.PI * freq / sampleRate;
            
            // Rich harmonic content with phase relationship
            let wave = Math.sin(lastPhase) * 0.55;
            wave += Math.sin(lastPhase * 2) * 0.35;
            wave += Math.sin(lastPhase * 3 + Math.PI/3) * 0.2;
            wave += Math.sin(lastPhase * 0.5 - Math.PI/6) * 0.15;
            
            // Voice quality - slight noise modulation
            const voiceNoise = (Math.random() * 2 - 1) * 0.08;
            wave = wave * 0.92 + voiceNoise * 0.08;
            
            // Natural envelope
            let envelope = 1;
            if (progress < 0.08) {
                envelope = progress / 0.08;
            } else if (progress > 0.88) {
                envelope = (1 - progress) / 0.12;
            } else if (progress > 0.5) {
                envelope = 1 - (progress - 0.5) * 0.1;
            }
            
            sound[i] = wave * envelope * 0.26;
        }
        return sound;
    }
    
    generatePurr(sound, sampleRate) {
        // Ultra-realistic purring - harmonic rumble with natural modulation
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            // Real cat purr dominant frequencies (around 25-50 Hz)
            // Use multiple frequencies to create the characteristic rumble
            const purr1 = Math.sin(2 * Math.PI * 28 * t) * 0.45;
            const purr2 = Math.sin(2 * Math.PI * 42 * t + Math.PI/4) * 0.35;
            const purr3 = Math.sin(2 * Math.PI * 38 * t + Math.PI/2) * 0.3;
            
            // Higher harmonics for richness
            const purr4 = Math.sin(2 * Math.PI * 85 * t) * 0.2;
            const purr5 = Math.sin(2 * Math.PI * 140 * t) * 0.12;
            const purr6 = Math.sin(2 * Math.PI * 200 * t) * 0.08;
            
            // Combine base frequencies
            let wave = purr1 + purr2 + purr3 + purr4 + purr5 + purr6;
            
            // Add natural amplitude modulation (the "pulsing" of purring)
            const modulation1 = Math.sin(progress * Math.PI * 6 + Math.random() * 0.3) * 0.35;
            const modulation2 = Math.sin(progress * Math.PI * 2.3 + Math.random() * 0.2) * 0.25;
            const modulationFactor = 0.65 + modulation1 + modulation2;
            
            // Add tiny frequency variations for naturalness
            const microJitter = Math.sin(t * 97.3) + Math.sin(t * 203.7);
            wave *= (1 + microJitter * 0.03);
            
            // Add faint breathing-like variation
            const breathing = Math.sin(progress * Math.PI * 0.8) * 0.15;
            
            // Subtle noise like actual laryngeal vibration
            const vocalNoise = (Math.random() * 2 - 1) * 0.02;
            
            wave = wave * modulationFactor + breathing + vocalNoise;
            
            // Gentle envelope
            let envelope = 1;
            if (progress < 0.1) {
                envelope = progress / 0.1;
            } else if (progress > 0.93) {
                envelope = (1 - progress) / 0.07;
            }
            
            sound[i] = wave * envelope * 0.15;
        }
        return sound;
    }
    
    generateLongMeow(sound, sampleRate) {
        // Extended realistic meow - like a cat calling out persistently
        let lastPhase = 0;
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            // Realistic pitch contour with multiple segments
            let targetFreq = 600;
            if (progress < 0.1) {
                // Fast initial rise
                targetFreq = 550 + progress / 0.1 * 250;
            } else if (progress < 0.4) {
                // Hold peak with slight variation
                targetFreq = 800 + Math.sin((progress - 0.1) * Math.PI * 2) * 150;
            } else if (progress < 0.75) {
                // Gradual descent
                targetFreq = 800 - (progress - 0.4) / 0.35 * 250;
            } else {
                // Final wavering before release
                targetFreq = 550 + Math.sin((progress - 0.75) * Math.PI * 4) * 100;
            }
            
            // Multiple types of variation
            const vibrato = Math.sin(progress * Math.PI * (6 + progress * 4)) * (40 + progress * 60);
            const jitter = Math.sin(t * 167) * 30;
            const microVibration = Math.sin(t * 389) * 20;
            
            const freq = Math.max(200, targetFreq + vibrato + jitter + microVibration);
            
            // Maintain phase continuity
            lastPhase += 2 * Math.PI * freq / sampleRate;
            
            // Very rich harmonic content for expressive meow
            let wave = Math.sin(lastPhase) * 0.6;
            wave += Math.sin(lastPhase * 2 - Math.PI/6) * 0.4;
            wave += Math.sin(lastPhase * 3 + Math.PI/4) * 0.25;
            wave += Math.sin(lastPhase * 4 - Math.PI/3) * 0.15;
            wave += Math.sin(lastPhase * 5) * 0.08;
            
            // Breathiness that increases with intensity
            const breathy = (Math.random() * 2 - 1) * (0.05 + progress * 0.1);
            wave = wave * 0.88 + breathy * 0.12;
            
            // Dynamic envelope with natural shape
            let envelope = 1;
            if (progress < 0.05) {
                envelope = progress / 0.05;
            } else if (progress > 0.9) {
                envelope = (1 - progress) / 0.1;
            } else if (progress > 0.6) {
                // Slight natural decay
                envelope = 1 - (progress - 0.6) * 0.08;
            }
            
            sound[i] = wave * envelope * 0.25;
        }
        return sound;
    }
    
    playCatSound() {
        // If there's a real audio element loaded, play it
        if (this.lastAudioElement) {
            this.lastAudioElement.currentTime = 0;
            this.lastAudioElement.play().catch(err => {
                console.log('Audio playback error:', err);
            });
            return;
        }
        
        // Otherwise play synthesized sound
        if (this.catAudioBuffer) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createBufferSource();
            source.buffer = this.catAudioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CatTranslator();
});
