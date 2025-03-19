async function initializeMicrophone(options = {}) {
    const useMic = options.audioFilename === undefined

    if (currentSheet.wad.tuner === undefined) {
        currentSheet.wad.tuner = new Wad.Poly({
            audioMeter: {
            }
        })
    }

    if (useMic) {
        if (currentSheet.wad.microphone === undefined) {
            currentSheet.wad.microphone = new Wad({source: "mic", volume: 5.0 })
        }

        currentSheet.currentMicrophone = currentSheet.wad.microphone
        currentSheet.wad.tuner.setVolume(0)
    }
    else {
        currentSheet.currentMicrophone = new Wad({source: options.audioFilename, volume: 2.0 })
        currentSheet.wad.tuner.setVolume(2)
    }

    currentSheet.wad.tuner.add(currentSheet.currentMicrophone)

    if (useMic && !Wad._common.permissionsGranted.micConsent) {
        currentSheet.wad.microphone.play() // Asks for permission first time
    
        await until(() => Wad._common.permissionsGranted.micConsent)

        currentSheet.wad.microphone.stop()
    }
}

async function startRecording(options = {}) {
    if (currentSheet.measures === undefined || currentSheet.measures.length === 0) {
        return
    }

    stopPlayOrRecord()

    currentSheet.recording.notes = []

    await initializeMicrophone()

    setPlayState(options.audioFilename === undefined ? "Recording" : "PlayingSheet")

    currentSheet.currentMicrophone.play()

    currentSheet.wad.tuner.updatePitch()

    const logPitch = function() {
        if (currentSheet.currentMicrophone === undefined) {
            return
        }

        currentSheet.recording.pitchInterval = requestAnimationFrame(logPitch)

        let noteName = currentSheet.wad.tuner.noteName
        let pitch = currentSheet.wad.tuner.pitch
        let volume = currentSheet.wad.tuner.audioMeter.volume

        if (noteName === undefined || pitch == undefined) {
            return
        }

        pitch = Math.round(pitch * 10) / 10.0

        let lastPlayedNote = currentSheet.recording.notes !== undefined && currentSheet.recording.notes.length > 0 ? currentSheet.recording.notes[currentSheet.recording.notes.length - 1] : undefined

        if (lastPlayedNote !== undefined) {
            lastPlayedNote.endTime = getTimeSeconds()
        }

        if (currentSheet.recording.notes === undefined || lastPlayedNote == undefined || lastPlayedNote.noteName !== noteName)
        {
            console.log(pitch, noteName)
            currentSheet.recording.notes.push({
                noteName: noteName,
                pitches: [],
                startTime: getTimeSeconds(),
                maxVolume: volume
            })
        }

        lastPlayedNote = currentSheet.recording.notes[currentSheet.recording.notes.length - 1]
        lastPlayedNote.pitches.push(pitch)
        lastPlayedNote.endTime = getTimeSeconds()
        lastPlayedNote.maxVolume = Math.max(lastPlayedNote.maxVolume, volume)
    }

    logPitch()

    startRealtimeAnalysis()
}

function stopPlayOrRecord() {
    stopCountdown(false)

    if (currentSheet.playback.playbackInterval !== undefined) {
        clearInterval(currentSheet.playback.playbackInterval)
        currentSheet.playback.playbackInterval = undefined

        if (currentSheet.playback.wad !== undefined) {
            currentSheet.playback.wad.stop()
            currentSheet.playback.wad = undefined
        }
    }

    if (currentSheet.recording.pitchInterval !== undefined) {
        clearInterval(currentSheet.recording.pitchInterval)
        currentSheet.recording.pitchInterval = undefined
    }

    if (currentSheet.recording.analyzeInterval !== undefined) {
        clearInterval(currentSheet.recording.analyzeInterval)
        currentSheet.recording.analyzeInterval = undefined
    }

    if (currentSheet.wad.tuner !== undefined) {
        currentSheet.wad.tuner.stopUpdatingPitch()
    }

    if (currentSheet.currentMicrophone !== undefined) {
        currentSheet.currentMicrophone.stop()
    }

    if (currentSheet.currentMicrophone !== undefined && currentSheet.wad.tuner !== undefined) {
        currentSheet.wad.tuner.remove(currentSheet.currentMicrophone)
        currentSheet.currentMicrophone = undefined
    }

    currentSheet.playback.noteIndex = undefined

    setPlayState("Stopped")

    generateVisuals()
}

function runTest(measurePool) {
    generateSheet(measurePool)

    startRecording({audioFilename: "sounds/cello1.mp3" })
}
