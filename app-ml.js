// Cat ↔ Human Translator App (ML-Powered Version)

class CatTranslator {
    constructor() {
        this.mediaRecorder = null;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = null;
        this.recordedChunks = [];
        this.recordingInProgress = false;
        this.humanAudioBuffer = null;
        this.catAudioBuffer = null;
        this.lastAudioElement = null;
        this.lastBufferSource = null;
        this.useML = false;
        this.mlReady = false;
        this.soundNet = null;
        
        this.initializeUI();
        this.initializeML();
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
    
    // ==================== ML INITIALIZATION ====================
    
    async initializeML() {
        try {
            console.log('Initializing ML models...');
            // Load SoundNet model for audio classification
            this.soundNet = await ml5.soundClassifier('SoundNet', () => {
                this.mlReady = true;
                console.log('🤖 ML Models ready! SoundNet loaded.');
                this.updateMethodDisplay('ML Ready! 🤖');
            });
        } catch (error) {
            console.log('ML initialization note:', error.message);
            console.log('Using signal processing mode. ML features will be available when ready.');
            this.mlReady = false;
        }
    }
    
    toggleML() {
        if (!this.mlReady) {
            alert('⏳ ML models are still loading. Please wait...');
            return;
        }
        this.useML = !this.useML;
        const btn = document.getElementById('useMLBtn');
        if (this.useML) {
            btn.style.background = '#27ae60';
            this.updateMethodDisplay('ML-Based Detection 🤖');
        } else {
            btn.style.background = '#9b59b6';
            this.updateMethodDisplay('Signal Processing (Default)');
        }
    }
    
    updateMethodDisplay(text) {
        document.getElementById('detectionMethod').textContent = text;
    }
    
    // ==================== CAT TO HUMAN ====================
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Use existing or create new MediaStreamAudioContext for recording
            const recordContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = recordContext.createMediaStreamSource(stream);
            this.analyser = recordContext.createAnalyser();
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
                
                // Analyze using ML if available and enabled
                if (this.useML && this.mlReady) {
                    await this.analyzeWithML(audioBlob);
                } else {
                    // Use traditional signal processing
                    const audioBuffer = await audioBlob.arrayBuffer();
                    await this.audioContext.decodeAudioData(audioBuffer, (decodedBuffer) => {
                        const emotion = this.analyzeAudio(decodedBuffer);
                        const translation = this.emotionToSentence(emotion);
                        
                        this.updateEmotionDisplay(emotion);
                        this.updateTranslationDisplay(translation);
                        this.generateHumanVoice(translation);
                    }, (error) => {
                        console.error('Error decoding audio:', error);
                        this.updateEmotionDisplay('Unknown');
                    });
                }
                
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
    
    // ==================== ML-BASED ANALYSIS ====================
    
    async analyzeWithML(audioBlob) {
        try {
            // Create URL from blob
            const audioURL = URL.createObjectURL(audioBlob);
            
            // Use SoundNet to classify sounds
            this.soundNet.classify(audioURL, (results) => {
                console.log('ML Classification Results:', results);
                
                // Map SoundNet predictions to cat emotions
                const emotion = this.mapSoundNetToCatEmotion(results);
                const translation = this.emotionToSentence(emotion);
                
                // Display results with confidence
                this.displayMLResults(emotion, results);
                this.updateTranslationDisplay(translation);
                this.generateHumanVoice(translation);
                
                // Cleanup
                URL.revokeObjectURL(audioURL);
            });
        } catch (error) {
            console.error('ML analysis error:', error);
            // Fallback to signal processing
            this.updateMethodDisplay('ML Error - Using Signal Processing');
            this.useML = false;
            document.getElementById('useMLBtn').style.background = '#9b59b6';
        }
    }
    
    mapSoundNetToCatEmotion(results) {
        // Map SoundNet labels to cat emotions
        if (!results || results.length === 0) return 'Neutral 😺';
        
        const topResults = results.slice(0, 3);
        console.log('Top predictions:', topResults);
        
        // Build confidence map
        const confidenceMap = {};
        topResults.forEach(result => {
            const label = result.label.toLowerCase();
            const confidence = result.confidence;
            
            // Heuristic mapping
            if (label.includes('meow') || label.includes('cat')) confidenceMap.meow = confidence;
            if (label.includes('hiss') || label.includes('growl')) confidenceMap.angry = confidence;
            if (label.includes('growl') || label.includes('roar')) confidenceMap.angry = confidence;
            if (label.includes('purr') || label.includes('rumble')) confidenceMap.happy = confidence;
            if (label.includes('cry') || label.includes('whine')) confidenceMap.scared = confidence;
            if (label.includes('motor') || label.includes('engine')) confidenceMap.hungry = confidence;
        });
        
        // Determine emotion based on top confidence
        let maxEmotion = 'Neutral 😺';
        let maxConfidence = 0;
        
        const emotionMap = {
            'meow': 'Happy 😸',
            'angry': 'Angry 😾',
            'happy': 'Happy 😸',
            'scared': 'Scared 😿',
            'hungry': 'Hungry 😹'
        };
        
        for (let emotion in confidenceMap) {
            if (confidenceMap[emotion] > maxConfidence) {
                maxConfidence = confidenceMap[emotion];
                maxEmotion = emotionMap[emotion] || 'Neutral 😺';
            }
        }
        
        return maxEmotion;
    }
    
    displayMLResults(emotion, results) {
        this.updateEmotionDisplay(emotion);
        
        // Show confidence scores
        const confidenceBox = document.getElementById('mlConfidence');
        const scoresDisplay = document.getElementById('confidenceScores');
        
        confidenceBox.classList.remove('hidden');
        
        // Build score display
        let html = '';
        results.slice(0, 5).forEach(result => {
            const percentage = (result.confidence * 100).toFixed(1);
            html += `
                <div class="score-item">
                    <span class="score-label">${result.label}</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="score-value">${percentage}%</span>
                </div>
            `;
        });
        
        scoresDisplay.innerHTML = html;
    }
    
    // ==================== SIGNAL PROCESSING (FALLBACK) ====================
    
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
        
        console.log('Signal Processing - Loudness:', loudness, 'Pitch:', pitch, 'Duration:', duration);
        
        const emotion = this.classifyEmotion(loudness, pitch, duration, frequencies);
        return emotion;
    }
    
    estimatePitch(data) {
        const SIZE = 4096;
        const MAX_SAMPLES = Math.floor(data.length);
        let best_offset = -1;
        let best_correlation = 0;
        let rms = 0;
        
        for (let i = 0; i < SIZE; i++) {
            const val = data[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        
        if (rms < 0.01) return 0;
        
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
        if (loudness > 0.6 && duration < 0.5) {
            return 'Angry 😾';
        }
        
        if (loudness > 0.3 && loudness < 0.7 && pitch > 30 && pitch < 100 && duration > 0.3) {
            return 'Happy 😸';
        }
        
        if (pitch > 80 && loudness > 0.2) {
            return 'Playful 😻';
        }
        
        if (pitch < 40 && loudness > 0.3 && loudness < 0.8) {
            return 'Hungry 😹';
        }
        
        if (loudness < 0.3) {
            return 'Scared 😿';
        }
        
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
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        this.lastUtterance = utterance;
        document.getElementById('playHumanBtn').disabled = false;
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
        
        // Check for sad emotion - play special audio
        const sadKeywords = ['sad', 'sadness', 'unhappy', 'upset', 'down', 'depressed', 'miserable', 'lonely', 'cry', 'tears'];
        if (sadKeywords.some(keyword => inputLower.includes(keyword))) {
            if (this.playRealCatSound('cat-angry.mpeg')) {
                // Show meow language translation for sad
                const sadMeow = '😿 Meooooww...';
                document.getElementById('meowTranslation').textContent = sadMeow;
                document.getElementById('meowTranslation').classList.add('filled');
                
                document.getElementById('catSoundOutput').textContent = '😿 Sad cat sound (Real audio)';
                document.getElementById('catSoundOutput').classList.add('filled');
                document.getElementById('playCatBtn').disabled = false;
                return;
            }
        }
        
        // Detect overall emotion from the text
        const emotion = this.detectTextEmotion(inputLower);
        
        // Generate emotion-based cat sounds
        const catSounds = this.generateEmotionBasedCatSounds(humanInput, emotion);
        
        // Display meow language translation
        document.getElementById('meowTranslation').textContent = catSounds.display;
        document.getElementById('meowTranslation').classList.add('filled');
        
        // Display cat sound output
        document.getElementById('catSoundOutput').textContent = catSounds.display;
        document.getElementById('catSoundOutput').classList.add('filled');
        
        this.generateCatAudio(catSounds.pattern, emotion);
        document.getElementById('playCatBtn').disabled = false;
    }
    
    detectTextEmotion(text) {
        // Emotion keywords with scores
        const emotions = {
            happy: ['love', 'like', 'good', 'yes', 'please', 'thank', 'happy', 'joy', 'fun', 'play', 'friend', 'nice', 'great', 'awesome', 'pet', 'cuddle', 'kiss'],
            hungry: ['hungry', 'food', 'eat', 'feed', 'starve', 'meal', 'snack', 'dinner', 'lunch', 'breakfast', 'kitchen'],
            angry: ['hate', 'angry', 'bad', 'mean', 'leave', 'go away', 'no', 'wrong', 'stupid', 'idiot', 'angry', 'mad', 'furious'],
            scared: ['scared', 'fear', 'afraid', 'run', 'help', 'hide', 'danger', 'terrified', 'panic'],
            sleepy: ['sleep', 'tired', 'rest', 'nap', 'bed', 'dream', 'yawn', 'sleepy', 'drowsy'],
            sad: ['sad', 'sadness', 'unhappy', 'upset', 'down', 'depressed', 'miserable', 'lonely', 'cry', 'tears', 'sad', 'sorrowful']
        };
        
        let scores = {
            happy: 0,
            hungry: 0,
            angry: 0,
            scared: 0,
            sleepy: 0,
            sad: 0
        };
        
        // Count emotion keyword occurrences
        for (let emotion in emotions) {
            emotions[emotion].forEach(keyword => {
                if (text.includes(keyword)) {
                    scores[emotion]++;
                }
            });
        }
        
        // Return dominant emotion
        let dominantEmotion = 'happy';
        let maxScore = 0;
        for (let emotion in scores) {
            if (scores[emotion] > maxScore) {
                maxScore = scores[emotion];
                dominantEmotion = emotion;
            }
        }
        
        // If no keywords matched, use text analysis
        if (maxScore === 0) {
            const hasQuestion = text.includes('?');
            const hasExclamation = text.includes('!');
            const wordCount = text.split(' ').length;
            const shortText = wordCount < 3;
            
            // Heuristics for emotion detection
            if (hasExclamation) dominantEmotion = 'angry'; // Exclamation = angry/excited
            if (hasQuestion && shortText) dominantEmotion = 'scared'; // Short question = scared/unsure
            if (text.length > 50) dominantEmotion = 'happy'; // Long text = happy
        }
        
        console.log('Detected emotion:', dominantEmotion, 'Keywords matched:', maxScore);
        return dominantEmotion;
    }
    
    generateEmotionBasedCatSounds(text, emotion) {
        const words = text.toLowerCase().split(/\s+/);
        let pattern = [];
        let display = '';
        let emoticons = {
            happy: '😸',
            hungry: '😺',
            angry: '😾',
            scared: '😻',
            sleepy: '😹',
            sad: '😿'
        };
        
        // Generate patterns based on detected emotion
        words.forEach((word) => {
            const soundPattern = this.emotionToSound(emotion, word);
            pattern.push(soundPattern.pattern);
            display += soundPattern.display + ' ';
        });
        
        return {
            pattern: pattern,
            emotion: emotion,
            display: `${emoticons[emotion]} ` + display.trim()
        };
    }
    
    emotionToSound(emotion, word) {
        let sound = '';
        let display = '';
        
        switch(emotion) {
            case 'happy':
                sound = 'meow';
                display = 'Mrrrow~';
                break;
            case 'hungry':
                // Hungry cats make yowling sounds
                sound = 'yowl';
                display = 'MEOWWW!';
                break;
            case 'angry':
                // Angry cats hiss and yowl
                sound = Math.random() > 0.5 ? 'hiss' : 'yowl';
                display = sound === 'hiss' ? 'Hisssss!' : 'Rowwww!';
                break;
            case 'scared':
                // Scared cats make long high-pitched sounds
                sound = 'long_meow';
                display = 'Meeeewww!';
                break;
            case 'sleepy':
                // Sleepy cats purr
                sound = 'purr';
                display = 'Prrr...';
                break;
            case 'sad':
                // Sad cats make mournful sounds
                sound = 'long_meow';
                display = 'Meooooww...';
                break;
            default:
                sound = 'meow';
                display = 'Meow';
        }
        
        return { pattern: sound, display: display };
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
            
            audio.load();
            this.lastAudioElement = audio;
            return true;
        } catch (e) {
            console.log('Error with real cat sound:', e);
            return false;
        }
    }
    
    generateCatAudio(patterns, emotion = 'happy') {
        console.log('🎯 generateCatAudio called with emotion:', emotion);
        const audioBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 3, this.audioContext.sampleRate);
        const data = audioBuffer.getChannelData(0);
        
        let sampleIndex = 0;
        
        patterns.forEach((soundType, idx) => {
            console.log(`  Sound ${idx}: type=${soundType}, emotion=${emotion}`);
            const soundData = this.generateCatSound(soundType, this.audioContext.sampleRate, emotion);
            for (let i = 0; i < soundData.length && sampleIndex < data.length; i++) {
                data[sampleIndex++] = soundData[i];
            }
        });
        
        this.catAudioBuffer = audioBuffer;
        console.log('✅ Audio buffer ready with', patterns.length, 'sound(s)');
    }
    
    generateCatSound(soundType, sampleRate, emotion = 'happy') {
        const duration = 0.6;
        const samples = Math.floor(sampleRate * duration);
        const sound = new Float32Array(samples);
        
        switch(soundType) {
            case 'meow':
                return this.generateMeow(sound, sampleRate, emotion);
            case 'hiss':
                return this.generateHiss(sound, sampleRate, emotion);
            case 'yowl':
                return this.generateYowl(sound, sampleRate, emotion);
            case 'purr':
                return this.generatePurr(sound, sampleRate, emotion);
            case 'long_meow':
                return this.generateLongMeow(sound, sampleRate, emotion);
            default:
                return this.generateMeow(sound, sampleRate, emotion);
        }
    }
    
    generateMeow(sound, sampleRate, emotion = 'happy') {
        // Adjust frequencies based on emotion - DRAMATIC differences
        let baseFreq = 800;
        let freqDeviation = 300;
        let amplitudeMultiplier = 0.27;
        
        if (emotion === 'angry') {
            baseFreq = 1800;  // VERY HIGH for anger
            freqDeviation = 600;
            amplitudeMultiplier = 0.35;  // Louder
        } else if (emotion === 'hungry') {
            baseFreq = 1200;   // High and urgent
            freqDeviation = 500;
            amplitudeMultiplier = 0.32;
        } else if (emotion === 'scared') {
            baseFreq = 1500;  // Very high-pitched scared meow
            freqDeviation = 700;
            amplitudeMultiplier = 0.30;
        } else if (emotion === 'sleepy') {
            baseFreq = 350;   // VERY LOW for sleepy
            freqDeviation = 150;
            amplitudeMultiplier = 0.18;  // Quieter
        }
        
        let lastPhase = 0;
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            let targetFreq = baseFreq;
            if (progress < 0.2) {
                targetFreq = baseFreq - freqDeviation + progress / 0.2 * freqDeviation;
            } else if (progress < 0.6) {
                targetFreq = baseFreq - (progress - 0.2) / 0.4 * 200;
            } else {
                targetFreq = baseFreq - 200 + (progress - 0.6) / 0.4 * 300;
            }
            
            const vibratoDepth = Math.min(progress * 80, 60);
            const vibrato = Math.sin(progress * Math.PI * 7 + Math.random() * 0.5) * vibratoDepth;
            const jitter = (Math.random() - 0.5) * 40;
            const freq = targetFreq + vibrato + jitter;
            
            lastPhase += 2 * Math.PI * freq / sampleRate;
            
            let wave = Math.sin(lastPhase) * 0.65;
            wave += Math.sin(lastPhase * 2) * 0.35;
            wave += Math.sin(lastPhase * 3) * 0.22;
            wave += Math.sin(lastPhase * 4 - Math.PI/4) * 0.12;
            
            const noise = (Math.random() * 2 - 1) * 0.08;
            wave = wave * 0.85 + noise * 0.15;
            
            let envelope = 1;
            if (progress < 0.03) {
                envelope = progress / 0.03;
            } else if (progress < 0.1) {
                envelope = 1 - (progress - 0.03) * 1.5;
            } else if (progress > 0.92) {
                envelope = (1 - progress) / 0.08;
            }
            
            sound[i] = wave * envelope * amplitudeMultiplier;
        }
        return sound;
    }
    
    generateHiss(sound, sampleRate, emotion = 'happy') {
        let filteredNoise = 0;
        
        // DRAMATIC differences based on emotion
        let amplitude = 0.22;
        let startFreq = 7000;
        let hissCharacter = 1.0;  // 1.0 = normal, > 1.0 = more aggressive
        
        if (emotion === 'angry') {
            amplitude = 0.45;     // MUCH louder
            startFreq = 10000;    // MUCH higher
            hissCharacter = 2.0;  // Very aggressive
        } else if (emotion === 'scared') {
            amplitude = 0.25;
            startFreq = 8500;
            hissCharacter = 1.5;
        } else if (emotion === 'sleepy') {
            amplitude = 0.12;
            startFreq = 5000;     // Lower
            hissCharacter = 0.5;  // Weak
        }
        
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            let noise = Math.random() * 2 - 1;
            
            filteredNoise = filteredNoise * 0.95 + (noise - filteredNoise) * 0.3;
            noise = filteredNoise;
            
            const freq = startFreq + Math.sin(progress * Math.PI * 2.5 * hissCharacter) * 3000;
            const phase = 2 * Math.PI * freq * t;
            noise += Math.sin(phase) * (0.3 * hissCharacter);
            
            let envelope = 1;
            if (progress < 0.02) {
                envelope = progress / 0.02;
            } else if (progress < 0.08) {
                envelope = 1 + (progress - 0.02) * 2 * hissCharacter;
            } else if (progress > 0.72) {
                envelope = (1 - progress) / 0.28;
            }
            
            sound[i] = noise * envelope * amplitude;
        }
        return sound;
    }
    
    generateYowl(sound, sampleRate, emotion = 'happy') {
        let lastPhase = 0;
        
        // DRAMATICALLY different frequencies for each emotion
        let baseFreq = 450;
        let pitchRange = 150;
        let amplitude = 0.26;
        
        if (emotion === 'hungry') {
            baseFreq = 650;      // Much higher - urgent
            pitchRange = 200;
            amplitude = 0.35;    // Louder
        } else if (emotion === 'angry') {
            baseFreq = 700;      // Even higher
            pitchRange = 300;
            amplitude = 0.38;    // Very loud
        } else if (emotion === 'scared') {
            baseFreq = 800;      // Very high
            pitchRange = 250;
            amplitude = 0.28;
        } else if (emotion === 'sleepy') {
            baseFreq = 250;      // VERY LOW
            pitchRange = 80;
            amplitude = 0.15;    // Soft
        }
        
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            let targetFreq = baseFreq;
            if (progress < 0.15) {
                targetFreq = baseFreq + progress / 0.15 * pitchRange;
            } else if (progress < 0.5) {
                targetFreq = baseFreq + pitchRange + Math.sin((progress - 0.15) * Math.PI * 2) * (pitchRange * 0.5);
            } else if (progress < 0.8) {
                targetFreq = baseFreq + pitchRange - (progress - 0.5) / 0.3 * pitchRange;
            } else {
                targetFreq = baseFreq + Math.sin((progress - 0.8) * Math.PI * 3) * (pitchRange * 0.7);
            }
            
            const vibratoRate = 5 + progress * 3;
            const vibrato = Math.sin(progress * Math.PI * vibratoRate) * (50 + progress * 40);
            const jitter = (Math.sin(t * 173.0) + Math.sin(t * 251.0)) * 30;
            const freq = Math.max(200, targetFreq + vibrato + jitter);
            
            lastPhase += 2 * Math.PI * freq / sampleRate;
            
            let wave = Math.sin(lastPhase) * 0.55;
            wave += Math.sin(lastPhase * 2) * 0.35;
            wave += Math.sin(lastPhase * 3 + Math.PI/3) * 0.2;
            wave += Math.sin(lastPhase * 0.5 - Math.PI/6) * 0.15;
            
            const voiceNoise = (Math.random() * 2 - 1) * 0.08;
            wave = wave * 0.92 + voiceNoise * 0.08;
            
            let envelope = 1;
            if (progress < 0.08) {
                envelope = progress / 0.08;
            } else if (progress > 0.88) {
                envelope = (1 - progress) / 0.12;
            } else if (progress > 0.5) {
                envelope = 1 - (progress - 0.5) * 0.1;
            }
            
            sound[i] = wave * envelope * amplitude;
        }
        return sound;
    }
    
    generatePurr(sound, sampleRate, emotion = 'happy') {
        let purrFrequency = 28;
        let amplitude = 0.15;
        
        // DRAMATICALLY different purr frequencies based on emotion
        if (emotion === 'angry') {
            purrFrequency = 80;   // Very high aggressive rumble
            amplitude = 0.28;     // Much louder
        } else if (emotion === 'scared') {
            purrFrequency = 50;   // Nervous, trembling
            amplitude = 0.18;
        } else if (emotion === 'sleepy') {
            purrFrequency = 12;   // VERY LOW deep relaxed
            amplitude = 0.10;     // Very soft
        } else if (emotion === 'hungry') {
            purrFrequency = 60;   // Demanding
            amplitude = 0.22;
        }
        
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            const purr1 = Math.sin(2 * Math.PI * purrFrequency * t) * 0.45;
            const purr2 = Math.sin(2 * Math.PI * (purrFrequency + 14) * t + Math.PI/4) * 0.35;
            const purr3 = Math.sin(2 * Math.PI * (purrFrequency + 10) * t + Math.PI/2) * 0.3;
            const purr4 = Math.sin(2 * Math.PI * (purrFrequency * 3) * t) * 0.2;
            const purr5 = Math.sin(2 * Math.PI * (purrFrequency * 5) * t) * 0.12;
            const purr6 = Math.sin(2 * Math.PI * (purrFrequency * 7) * t) * 0.08;
            
            let wave = purr1 + purr2 + purr3 + purr4 + purr5 + purr6;
            
            const modulation1 = Math.sin(progress * Math.PI * 6 + Math.random() * 0.3) * 0.35;
            const modulation2 = Math.sin(progress * Math.PI * 2.3 + Math.random() * 0.2) * 0.25;
            const modulationFactor = 0.65 + modulation1 + modulation2;
            
            const microJitter = Math.sin(t * 97.3) + Math.sin(t * 203.7);
            wave *= (1 + microJitter * 0.03);
            
            const breathing = Math.sin(progress * Math.PI * 0.8) * 0.15;
            const vocalNoise = (Math.random() * 2 - 1) * 0.02;
            
            wave = wave * modulationFactor + breathing + vocalNoise;
            
            let envelope = 1;
            if (progress < 0.1) {
                envelope = progress / 0.1;
            } else if (progress > 0.93) {
                envelope = (1 - progress) / 0.07;
            }
            
            sound[i] = wave * envelope * amplitude;
        }
        return sound;
    }
    
    generateLongMeow(sound, sampleRate, emotion = 'happy') {
        let lastPhase = 0;
        
        // DRAMATICALLY different frequencies for each emotion
        let baseFreq = 600;
        let amplitude = 0.25;
        
        if (emotion === 'scared') {
            baseFreq = 1200;  // VERY HIGH-pitched scared meow
            amplitude = 0.32;
        } else if (emotion === 'angry') {
            baseFreq = 1400;  // Very angry long meow
            amplitude = 0.35;
        } else if (emotion === 'sleepy') {
            baseFreq = 300;   // VERY DEEP, slow meow
            amplitude = 0.15;
        } else if (emotion === 'hungry') {
            baseFreq = 900;   // Urgent and demanding
            amplitude = 0.30;
        } else if (emotion === 'sad') {
            baseFreq = 500;   // Low, mournful sad meow
            amplitude = 0.22;
        }
        
        for (let i = 0; i < sound.length; i++) {
            const t = i / sampleRate;
            const progress = t / (sound.length / sampleRate);
            
            let targetFreq = baseFreq;
            if (progress < 0.1) {
                targetFreq = baseFreq - 50 + progress / 0.1 * 250;
            } else if (progress < 0.4) {
                targetFreq = baseFreq + 200 + Math.sin((progress - 0.1) * Math.PI * 2) * 150;
            } else if (progress < 0.75) {
                targetFreq = baseFreq + 200 - (progress - 0.4) / 0.35 * 250;
            } else {
                targetFreq = baseFreq - 50 + Math.sin((progress - 0.75) * Math.PI * 4) * 100;
            }
            
            const vibrato = Math.sin(progress * Math.PI * (6 + progress * 4)) * (40 + progress * 60);
            const jitter = Math.sin(t * 167) * 30;
            const microVibration = Math.sin(t * 389) * 20;
            
            const freq = Math.max(200, targetFreq + vibrato + jitter + microVibration);
            lastPhase += 2 * Math.PI * freq / sampleRate;
            
            let wave = Math.sin(lastPhase) * 0.6;
            wave += Math.sin(lastPhase * 2 - Math.PI/6) * 0.4;
            wave += Math.sin(lastPhase * 3 + Math.PI/4) * 0.25;
            wave += Math.sin(lastPhase * 4 - Math.PI/3) * 0.15;
            wave += Math.sin(lastPhase * 5) * 0.08;
            
            const breathy = (Math.random() * 2 - 1) * (0.05 + progress * 0.1);
            wave = wave * 0.88 + breathy * 0.12;
            
            let envelope = 1;
            if (progress < 0.05) {
                envelope = progress / 0.05;
            } else if (progress > 0.9) {
                envelope = (1 - progress) / 0.1;
            } else if (progress > 0.6) {
                envelope = 1 - (progress - 0.6) * 0.08;
            }
            
            sound[i] = wave * envelope * amplitude;
        }
        return sound;
    }
    
    playCatSound() {
        // Stop any previously playing synthesized audio
        if (this.lastBufferSource) {
            try {
                this.lastBufferSource.stop();
            } catch (e) {
                // Already stopped, ignore
            }
        }
        
        // Play synthesized cat audio
        if (this.catAudioBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.catAudioBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            this.lastBufferSource = source;
            console.log('🔊 Playing synthesized cat sound');
        } else {
            console.log('No synthesized audio available');
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CatTranslator();
});
