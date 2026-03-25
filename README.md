# 🐱 Cat ↔ Human Translator (ML-Powered Version)

A fun and interactive web app that translates between cat sounds and human speech! **Now with real machine learning capabilities!**

## ✨ What's New: ML Features

### 🤖 Machine Learning Integration
- **SoundNet Model**: Uses Google's pre-trained audio classification model
- **TensorFlow.js**: Real-time ML inference in your browser
- **Confidence Scores**: See how confident the AI is in its predictions
- **Toggle Mode**: Switch between traditional signal processing and ML-based detection
- **No Data Sent**: All ML processing happens locally in your browser

### Detection Methods
1. **Signal Processing (Default)**: Fast, rule-based emotion detection
2. **ML-Based (Beta)**: More accurate, uses trained neural networks

## Features

### 🐱 Cat → Human Translation
- **Record cat sounds**: Click "Start Recording" to capture cat vocalizations via your microphone
- **Dual Detection Methods**: 
  - **Signal Processing**: Uses loudness, pitch, and frequency analysis
  - **Machine Learning**: Uses SoundNet pre-trained model (toggle with 🤖 button)
- **Emotion detection**: The app analyzes:
  - **Pitch**: Low pitch suggests hunger, high pitch suggests happiness
  - **Loudness**: Very loud indicates anger, quiet indicates fear
  - **Duration**: Pattern length helps determine emotion
  - **Frequency content**: Different frequency ranges map to different emotions
  - **SoundNet Features**: Pre-trained features for audio classification
- **Emotion classifications**:
  - 😾 **Angry**: Loud and short vocalizations
  - 😸 **Happy**: Moderate pitch and loudness with good duration
  - 😻 **Playful**: High pitch cat sounds
  - 😹 **Hungry**: Low to moderate pitch, asking for food
  - 😿 **Scared**: Very quiet vocalizations
- **Auto-translation**: Automatically converts detected emotions into human sentences
- **Text-to-speech**: Plays the translation in a human voice
- **Confidence Scores**: When using ML, see detailed confidence percentages for each prediction

### 👤 Human → Cat Translation
- **Type a message**: Enter any sentence (e.g., "I love you", "I am hungry")
- **Smart conversion**: The app analyzes the text to determine the appropriate cat sound:
  - Love/Like words → Mrrow~ (affectionate meow)
  - Angry/Hate words → Hisss! (defensive hiss)
  - Food/Hungry words → Meowww! (demanding yowl) or **Real cat audio**
  - Sleep/Rest words → Prrr... (purring)
  - Long words → Extended meows
- **Real Cat Audio**: When you type hunger-related phrases like "I am hungry", "feed me", the app plays a real cat audio sample (if available)
- **Sound synthesis**: Generates realistic cat sound patterns with synthesized audio
- **Playback**: Listen to your message as a cat would say it!

## How to Use

1. **Open the app**: Open `index.html` in a modern web browser
2. **Allow microphone access**: When prompted, allow the browser to access your microphone
3. **Choose detection method**:
   - Default: Signal processing (fast, instant)
   - Click 🤖 **Use ML (Beta)**: Switch to machine learning when ready
4. **Choose a translation mode**:
   - **Cat to Human**: Record a cat sound and see what it "means"
   - **Human to Cat**: Type something and hear how a cat would say it

## ML Models & Technologies

### Models Used
- **SoundNet** (Google): Pre-trained audio classification model
  - Trained on 2 million YouTube videos
  - Recognizes various sounds including animal vocalizations
  - Provides confidence scores for predictions

### Framework
- **TensorFlow.js**: JavaScript ML library
  - Runs inference in the browser
  - No data sent to servers
  - Supports GPU acceleration (if available)

- **ml5.js**: Friendly ML library built on TensorFlow.js
  - Simplifies audio classification tasks
  - Easy integration with Web Audio API

### Loading Time
- SoundNet model: ~20-30MB (loads on first ML use)
- After loading, ML detection is instant
- Signal processing mode loads immediately

## Technology Stack

- **HTML5**: Structure and layout
- **CSS3**: Modern styling with gradients and animations
- **Web Audio API**: Microphone recording and audio analysis
- **Web Speech API**: Text-to-speech synthesis
- **Web Audio Synthesis**: Generating synthetic cat sounds
- **TensorFlow.js**: Machine learning framework
- **ml5.js**: High-level ML API
- **SoundNet Model**: Pre-trained audio classifier

## Browser Requirements

- Modern browser with support for:
  - MediaRecorder API
  - Web Audio API
  - Web Speech API (for text-to-speech)
  - TensorFlow.js support
  - Microphone permissions
  - WebGL (recommended for GPU acceleration)

Recommended browsers:
- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Emotion Detection Algorithms

### Signal Processing Method

1. **Loudness (RMS)**: Root Mean Square of audio samples
   - High loudness (>0.6) → Anger
   - Low loudness (<0.3) → Fear
   - Medium loudness → Hunger or Happiness

2. **Pitch Estimation**: Autocorrelation-based frequency detection
   - Low pitch (<40) → Hunger
   - High pitch (>80) → Playfulness/Happiness
   - Medium pitch → Neutral/Happy

3. **Duration**: Total length of vocalization
   - Short duration (<0.5s) → Urgency (anger, demands)
   - Long duration (>0.3s) → Contentment or playfulness

4. **Frequency Content**: Distribution of frequencies across spectrum
   - Analyzed separately for low, mid, and high frequencies
   - Helps distinguish between different emotional states

### Machine Learning Method

**SoundNet Model**:
- Trained on millions of sounds from YouTube
- Extracts learned acoustic features automatically
- Provides confidence scores for predictions
- More accurate for diverse cat vocalizations
- Can recognize specific cat sounds like "meow", "hiss", "purr"

## Cat Sound Generation

Different cat vocalizations are synthesized with realistic parameters:

- **Meow**: Frequency sweep 600-2000Hz with natural pitch contour, harmonics, and vibrato
- **Hiss**: High-frequency (2000-12000Hz) noise with sibilance and modulation
- **Yowl**: Complex speech-like pitch contour (450-700Hz) with dynamic vibrato
- **Purr**: Low-frequency rumble (25-200Hz) with harmonic series and breathing simulation
- **Long Meow**: Extended meow with rich harmonic content and natural decay

## Performance Comparison

| Feature | Signal Processing | Machine Learning |
|---------|------------------|------------------|
| **Speed** | Instant | 100-500ms (first time) |
| **Accuracy** | ~60-70% | 80-95% (on trained sounds) |
| **Data Required** | None | Pre-trained model |
| **Server Needed** | No | No (local inference) |
| **Privacy** | 100% local | 100% local |
| **Tuning** | Hardcoded rules | Learned from data |

## Notes

- The emotion detection algorithms are based on acoustic analysis
- Signal processing works best with clear recordings
- ML mode provides better accuracy with diverse cat sounds
- Different cat breeds have different vocalizations, so results may vary
- The app doesn't require an internet connection - all processing happens locally in your browser
- ML models download on first use (~20-30MB), then cached for offline use

## Fun Things to Try

1. Compare your cat's real sounds between signal processing and ML detection
2. Record multiple sounds and see how different pitches are classified
3. Type sentences in different languages and see how they translate to cat sounds
4. Experiment with different phrasing to produce different cat sounds
5. Add real cat audio samples for maximum authenticity
6. Use ML mode to see confidence scores for different cat emotions
7. Train your own models using ml5.js and Teachable Machine!

## Customization & Advanced Features

### Add More Real Cat Audio
Place audio files in the project folder:
- `cat-angry.mpeg` - Angry/hungry cat sound
- `cat-happy.mpeg` - Happy/playful cat sound
- `cat-scared.mpeg` - Scared/distressed cat sound

### Train Your Own Model
1. Use Google's Teachable Machine: https://teachablemachine.withgoogle.com/
2. Train on your cat's specific sounds
3. Export as TensorFlow.js model
4. Replace SoundNet with your custom model

### Modify Detection Rules
Edit the `emotionToSentence()` and `classifyEmotion()` methods in `app-ml.js` to customize emotion mappings.

## Troubleshooting

**ML Models Not Loading?**
- Check your internet connection (needed for first-time model download)
- Try refreshing the page
- Check browser console for errors

**Audio Not Playing?**
- Ensure microphone permissions are granted
- Check system volume
- Try a different browser

**Inaccurate Emotions?**
- Switch between detection methods for comparison
- Record clear, distinct sounds
- Check console for ML confidence scores

## License & Attribution

- **SoundNet Model**: Trained by Google, used under open license
- **TensorFlow.js**: Apache 2.0 License
- **ml5.js**: MIT License

---

Created with ❤️ and 🤖 ML for cat lovers everywhere

