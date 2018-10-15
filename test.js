async function test () {
    let timesheet = [
        ['32010000-1', '-', 'Føre timer i UBW', '100', '', '100'],
        ['32010025-1', '14', 'VEGLOGG-6432 Filvedlegg i sak', '', '8'],
        ['32010025-1', '15', 'VEGLOGG-6438 Søkekriterier', '', '', '8'],
        ['32610015-2', '-', 'Rådgivning', '', '', '', '8'],
        ['32610015-3', '', 'JS Fundementals', '', '', '', '', '8'],
        ['', '', 'qwerty', '😆', '', '', '', '8'],
    ].map(row => row.join('\t'))
    .join('\n')

    fillTimesheet(timesheet)
}
