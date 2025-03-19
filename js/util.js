function getTimeSeconds() {
    return new Date().getTime() / 1000.0
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min
}

function until(conditionFunction) {
    const poll = resolve => {
        if (conditionFunction()) {
            resolve()
        }
        else {
            setTimeout(_ => poll(resolve), 400)
        }
    }
  
    return new Promise(poll)
}

function toggleElement(element, on) {
    element.style.display = on ? "inline-block" : "none"
}

function showElement(element, on) {
    element.style.visibility = on ? "visible" : "hidden"
}

async function performCountdown() {
    setPlayState("CountingDown")

    const countdownNumber = document.getElementById("countdown")

    let promise = new Promise((resolve, reject) => {
        if (countdownNumber.value <= 0) {
            resolve()
            return
        }

        currentSheet.countdown.promise.resolve = resolve
        currentSheet.countdown.promise.reject = reject

        let countdown = countdownNumber.value
        showBoxedText("" + countdown, "black")

        currentSheet.countdown.interval = setInterval(() => {
            countdown -= 1
            if (countdown <= 0) {
                stopCountdown(true)
                return
            }

            showBoxedText("" + countdown, "black")
        }, 1000)
    })

    await promise
}

function stopCountdown(success) {
    if (currentSheet.countdown.interval !== undefined) {
        clearInterval(currentSheet.countdown.interval)
        currentSheet.countdown.interval = undefined
    }

    if (success && currentSheet.countdown.promise.resolve !== undefined) {
        currentSheet.countdown.promise.resolve()
    }

    if (!success && currentSheet.countdown.promise.reject !== undefined) {
        currentSheet.countdown.promise.reject()
    }

    currentSheet.countdown.promise.resolve = undefined
    currentSheet.countdown.promise.reject = undefined
}

function getSvgBoundingBox() {
    const svgContext = document.getElementById("output").firstElementChild
    if (svgContext === undefined) {
        return {left: 0, top: 0, right: 0, bottom: 0}
    }

    const rect = svgContext.getBoundingClientRect()
    
    return {left: rect.left + window.scrollX, top: rect.top + window.scrollY, right: rect.right + window.scrollX, bottom: rect.bottom + window.scrollY}
}

function getDisplayNoteName(noteName) {
    const match = noteName.match(/\d/)
    
    if (match) {
        return noteName.substring(0, match.index)
    }

    return noteName
}

function getNoteNameWithoutDuration(noteName) {
    return noteName.substring(0, noteName.indexOf("/"))
}
