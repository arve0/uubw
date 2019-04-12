// cancel dragover to allow dropping over other elements
document.addEventListener('dragover', e => e.preventDefault())

document.addEventListener('drop', async event => {
    if (!timesheetIsActive()) {
        return
    }
    event.preventDefault()

    const file = toArray(event.dataTransfer.items).find(i => i.type === 'text/tab-separated-values' || i.type === 'text/csv')
    if (!file) {
        return console.warn('Fant ingen CSV eller TSV fil, avbryter.')
    }

    let tsv
    try {
        const contents = await readFile(file.getAsFile())
        tsv = file.type === 'text/csv'
            ? toggl_til_tsv(contents)
            : contents
    } catch (err) {
        alert(`Konvertering av CSV feilet: ${err.message}`)
        return
    }

    fillTimesheet(tsv)
})

function timesheetIsActive () {
    return $$('a.u4-activitybreadcrumbitem-button')
        .filter(isVisible)
        .map(el => el.innerText.trim())
        .some(text => text.includes('Timeliste'))
}

function readFile (file) {
    return new Promise((resolve) => {
        const filereader = new FileReader()
        filereader.readAsText(file)
        filereader.onload = () => resolve(filereader.result)
    })
}

async function fillTimesheet(tsv) {
    const timesheetEntries = tsv.split('\n')
        .filter(line => line[0] !== ';')
        .map(line =>
            line.split('\t')
                .map(col => col.trim())
        )

    for (const entry of timesheetEntries) {
        try {
            await fillTimesheetRow(entry)
        } catch (err) {
            console.error(err)
            alert(err.message)
        }
    }
}

async function fillTimesheetRow([ workorder, activity, description, ...hoursByDay ]) {
    console.log([ workorder, activity, description, ...hoursByDay ].join(', '))

    if (workorder === '') {
        throw new Error(`Ingen timekode for '${description}', hopper over.`)
    }

    if (workorder.indexOf('ABSENCE') === 0) {
        await addAbsenceRow(description)
    } else {
        await addRow(workorder, activity, description)
    }

    for (let day = 1; day <= hoursByDay.length; day++) {
        let amount = hoursByDay[day - 1]
        if (amount === '') {
            continue;
        } else if (isNaN(parseFloat(amount))) {
            alert(`Forventet et tall, men fikk '${amount}'. Hopper over,`)
            continue;
        }
        const amountInput = $(`input[name="regValue${day}"]`) // regValue1 is first day
        // Does this hold true for week that starts at wednesday? Like 1. july 2018.
        amountInput.value = amount
    }
    await sleep(500)
}

async function addAbsenceRow (description) {
    $('a[data-u4id="addAbsenceBtn"]').click()
    await waitFor('input[placeholder="Type fravær"]')
    getByText('tr[role="row"]', description).click()
    getByText('a', 'Legg til i timeliste').click()
    await untilLoadingDone()
}

async function addRow (workorder, activity, description) {
    click('a[data-qtip="Legg til arb.oppgave"]')
    await untilLoadingDone(1000)

    const codeInput = await waitFor('input[placeholder="Søk i prosjekt eller arbeidsordre"]')
    codeInput.value = workorder
    codeInput.dispatchEvent(new Event('keyup'))
    await untilLoadingDone()

    const codeElement = await waitFor(`[data-qtip="${workorder}"]`)
    codeElement.click()

    if (activity !== '-' && activity !== '') {
        try {
            const activityElement = await waitFor(`[data-recordid="${activity}"]`)
            activityElement.click()
        } catch (err) {
            alert(`Ventet på aktivitet '${activity}', men aktiviteten dukket ikke opp.\n\n` +
                  `Velg riktig aktivitet for '${description}' innen 5 sekunder.`)
            await sleep(5 * 1000)
        }
    }

    const addCodeElement = await waitFor('[data-u4id="addToTimesheetBtn"]:not(.x-disabled)')
    addCodeElement.click()
    await untilLoadingDone()

    const tableView = await waitFor('div[data-u4id="abw-pcb-timesheet-grid-view"]')
    const descriptionInput = await waitFor('table[data-u4id="descriptionEditor"] input', tableView)
    descriptionInput.value = description
}

function $ (selector, element = document) {
    return element.querySelector(selector)
}
function $$ (selector, element = document) {
    return Array.from(element.querySelectorAll(selector))
}
function getByText (selector, text, element = document) {
    return $$(selector, element)
        .filter(e => e.innerText)
        .find(el => startsWith(el.innerText, text))
}
function startsWith(text, start) {
    return text.trim().toLowerCase().indexOf(start.toLowerCase()) === 0
}
function toArray (arrayLike) {
    return arrayLike ? Array.from(arrayLike) : []
}
function click (element) {
    if (typeof element === 'string') {
        $(element).dispatchEvent(new Event('click'))
    } else {
        element.dispatchEvent(new Event('click'))
    }
}
function waitFor (selector, parent) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Ventet på ${selector}, men den dukket ikke opp.`)), 5 * 1000)
        const interval = setInterval(() => {
            const element = $(selector, parent)
            if (element !== null) {
                clearTimeout(timeout)
                clearInterval(interval)
                resolve(element)
            }
        }, 100)
    })
}
function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
function untilLoadingDone (timeout = 2000) {
    let hasBeenLoading = isLoading()
    let done = false

    return new Promise(resolve => {
        let interval = setInterval(async () => {
            // safe to waitFor, as element is not removed after loading is done
            let loading = isLoading()

            if (!hasBeenLoading && loading) {
                hasBeenLoading = true;
            } else if (hasBeenLoading && !loading) {
                done = true
                clearInterval(interval)
                setTimeout(resolve, 300)  // let things calm down
            }
        }, 10)

        // make sure we eventually resolve
        setTimeout(() => {
            if (done) { return }  // avoid race
            clearInterval(interval)
            resolve()
        }, timeout)
    })
}
function isLoading () {
    return $$('.x-mask-msg-text')
        .filter(e => e.innerText.trim() === 'Laster...')
        .some(isVisible)
}
function isVisible (element) {
    var rect = element.getBoundingClientRect()

    return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
    )
}
