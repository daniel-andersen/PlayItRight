var measurePools = {
    randomEasy: {
        measureSelectionStrategy: "random",
        measures: [
            //[{ notes: ["A3/2"] }, { notes: ["B3/2"] }],
            //[{ notes: ["A3/4"] }, { notes: ["B3/2"] }, { notes: ["G3/8", "F3/8"] }]
            [{ notes: ["A3/2"] }, { notes: ["D4/2"] }],
            [{ notes: ["D3/1"] }],
            [{ notes: ["D3/2"] }, { notes: ["A3/2"] }],
            [{ notes: ["A2/1"] }],
            [{ notes: ["G2/2"] }, { notes: ["C3/2"] }],
            [{ notes: ["G2/1"] }],
            [{ notes: ["D3/4"] }, { notes: ["F3/4"] }, { notes: ["E3/2"] }],
        ],
    },
    warmupExercise: {
        measureSelectionStrategy: "sequence",
        measures: [
            [{ notes: ["A3/2"] }, { notes: ["D4/2"] }],
            [{ notes: ["D3/1"] }],
            [{ notes: ["D3/2"] }, { notes: ["A3/2"] }],
            [{ notes: ["A2/1"] }],
            [{ notes: ["G2/2"] }, { notes: ["C3/2"] }],
            [{ notes: ["G2/1"] }],
        ]
    }
}

function generateSheet(measurePool) {
    resetCurrentSheet()

    if (measurePool.measureSelectionStrategy === "random") {
        generateRandomSheet(measurePool)
    }
    else if (measurePool.measureSelectionStrategy === "sequence") {
        generateSequenceSheet(measurePool)
    }
}

function generateRandomSheet(measurePool) {
    currentSheet.measures = []

    var remainingPool = measurePool.measures.slice()

    for (var i = 0; i < measurementCount; i++) {
        var randomIndex = getRandomInt(0, remainingPool.length)
        var measure = remainingPool[randomIndex].slice()

        currentSheet.measures.push(measure)

        remainingPool.splice(randomIndex, 1)
    }
}

function generateSequenceSheet(measurePool) {
    currentSheet.measures = []

    for (var i = 0; i < measurePool.measures.length; i++) {
        var measure = measurePool.measures[i].slice()

        currentSheet.measures.push(measure)
    }
    console.log(currentSheet.measures)
}
