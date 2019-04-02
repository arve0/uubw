(function (global) {
    global.toggl_til_tsv = function (csv) {
        const [first, ...lines] = csv.split('\n')
        const labels = split_csv_line(first)

        const time_entries = lines
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .map(to_time_entry(labels))

        notify_if_rounding_error_in_hours_sum(time_entries)

        const tsv = time_entries_to_tsv(time_entries)
        return tsv.map(line =>
            line.map(col => typeof col === 'number'
                ? col === 0 ? '' : col.toFixed(1).replace('.', ',')
                : col
            ).join('\t')
        ).join('\n')
    }

    function split_csv_line(str) {
        const columns = []
        let current_column = ''
        let string_literal = false
        for (let i = 0; i < str.length; i++) {
            const ch = str.charAt(i)
            if (ch === ',' && !string_literal) {
                columns.push(current_column)
                current_column = ''
            } else if (ch === '"') {
                string_literal = !string_literal
            } else {
                current_column += ch
            }
        }
        return columns
    }

    function to_time_entry(labels) {
        return function (line) {
            const columns = split_csv_line(line)
            const columns_to_pick = ['Description', 'Start date', 'End date', 'Duration', 'Tags']
            const columns_numbers = columns_to_pick.map(col => labels.indexOf(col))
            columns_numbers.forEach((i, ii) => {
                if (i === -1) {
                    throw new Error(`Konvertering av CSV feilet, fant ikke kolonnen ${columns_to_pick[ii]}.`)
                }
            })

            let time_entry = columns.reduce((acc, val, i) => {
                if (columns_numbers.includes(i)) {
                    const label = columns_to_pick[columns_numbers.indexOf(i)].toLowerCase().replace(/\W/g, '_')
                    acc[label] = val
                }
                return acc
            }, {})
            time_entry = calculate_time_in_hours_and_round_to_nearest_half_hour(time_entry)
            return tags_to_timekode_and_aktivitet(time_entry)
        }
    }

    function tags_to_timekode_and_aktivitet(time_entry) {
        time_entry.timekode = get_regex_group(time_entry.tags, /.*timekode:([^ ,]+).*/, true)
        time_entry.aktivitet = get_regex_group(time_entry.tags, /.*aktivitet:([^ ,]+).*/)

        delete time_entry.tags
        return time_entry
    }

    function get_regex_group(str, regex, fail_hard = false) {
        const match = str.match(regex)
        if (fail_hard && match === null) {
            throw new Error(`Konvertering av CSV feilet, fant ikke ${regex} i taggene: ${str}`)
        } else if (match === null) {
            return ''
        }
        return match[1]
    }

    function calculate_time_in_hours_and_round_to_nearest_half_hour(time_entry) {
        let [hours, minutes, seconds] = time_entry.duration.split(':').map(n => parseInt(n))
        time_entry.hours_exact = (hours + minutes / 60 + seconds / 60 / 60)
        time_entry.hours_rounded = Math.round(2 * time_entry.hours_exact) / 2
        return time_entry
    }

    function notify_if_rounding_error_in_hours_sum(time_entries) {
        const days = new Set(time_entries.map(e => e.start_date))

        days.forEach(day => {
            const entries_this_day = time_entries.filter(e => e.start_date === day)
            const exact_sum = entries_this_day.reduce((sum, { hours_exact }) => sum + hours_exact, 0)
            const rounded_sum = entries_this_day.reduce((sum, { hours_rounded }) => sum + hours_rounded, 0)

            if (Math.round(2 * exact_sum) / 2 !== rounded_sum) {
                alert(`ADVARSEL: Mulig avrundingsfeil funnet for ${pretty_date(day)}\n\n` +
                      `Avrundet sum '${rounded_sum}' er ikke lik eksakt sum '${exact_sum.toFixed(2)}' avrundet.`)
            }
        })
    }

    function time_entries_to_tsv(time_entries) {
        //Arbeidsordre	Aktivitet	Beskrivelse	Mandag	Tirsdag	Onsdag	Torsdag	Fredag
        const lines = []

        time_entries.sort(sort_by_date)
        const first_day = time_entries[0].start_date
        const last_day = time_entries[time_entries.length - 1].start_date
        const number_of_days = number_of_days_since(last_day, first_day) + 1

        lines.push([';Arbeidsordre', 'Aktivitet', 'Beskrivelse', ...(get_days(first_day, number_of_days))])

        time_entries.forEach(time_entry => {
            let line
            if (lines.some(line => has_same_timekode_aktivitet_and_beskrivelse(line, time_entry))) {
                line = lines.find(line => has_same_timekode_aktivitet_and_beskrivelse(line, time_entry))
            } else {
                line = create_tsv_line(time_entry, number_of_days)
                lines.push(line)
            }
            let n_day = number_of_days_since(time_entry.start_date, first_day)
            line[3 + n_day] += time_entry.hours_rounded
        })

        if (confirm("Legge til 0,5t lunsj og lunjspenger for dagene du har jobbet?")) {
            lines.push(['ABSENCE-1', '', 'Lunsj for de med 7,5 timer fakturerbart', ...(new Array(number_of_days).fill('0,5'))])
            lines.push(['ABSENCE-2', '', 'Lunsjpenger', ...(new Array(number_of_days).fill('1'))])
        }

        return lines
    }

    function sort_by_date(a, b) {
        if (a.start_date > b.start_date) {
            return 1
        } else if (a.start_date < b.start_date) {
            return -1
        }
        return 0
    }

    function number_of_days_since(day, since) {
        return (new Date(day) - new Date(since)) / 86400000
    }

    function get_days(first_day, number_of_days) {
        return new Array(number_of_days).fill(first_day).map(pretty_date)
    }

    function pretty_date(date, diff = 0) {
        const d = new Date(date)
        const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tors', 'Fre', 'Lør']
        return `${days[(d.getDay() + diff) % 7]} ${d.getDate() + diff}.`
    }

    function has_same_timekode_aktivitet_and_beskrivelse(tsv, time_entry) {
        return tsv[0] === time_entry.timekode && tsv[1] === time_entry.aktivitet && tsv[2] === time_entry.description;
    }

    function create_tsv_line(time_entry, number_of_days) {
        return [time_entry.timekode, time_entry.aktivitet, time_entry.description, ...(new Array(number_of_days).fill(0))]
    }

    function get_year_and_week() {
        // https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php/6117889#6117889
        let d = new Date();
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        // Get first day of year
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        // Calculate full weeks to nearest Thursday
        var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        // Return array of year and week number
        return [d.getUTCFullYear(), weekNo];
    }

})(window);

