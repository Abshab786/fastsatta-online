/*
   FASTSATTA.ONLINE - Admin-Only Live Result Control & Precise Spotlight Hierarchy
*/

document.addEventListener('DOMContentLoaded', () => {

    // Helper: Get Asia/Kolkata Current Date String (e.g. "11 October 2026")
    function getKolkataDateString() {
        const options = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' };
        return new Intl.DateTimeFormat('en-GB', options).format(new Date());
    }

    // 1. Dynamic SEO Title & Meta Description Sync
    const currentDateStr = getKolkataDateString();

    if (document.title.includes('[Current Date]')) {
        document.title = document.title.replace('[Current Date]', currentDateStr);
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.content.includes('[Current Date]')) {
        metaDesc.content = metaDesc.content.replace(/\[Current Date\]/g, currentDateStr);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content.includes('[Current Date]')) {
        ogTitle.content = ogTitle.content.replace('[Current Date]', currentDateStr);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.content.includes('[Current Date]')) {
        ogDesc.content = ogDesc.content.replace(/\[Current Date\]/g, currentDateStr);
    }

    // 2. Mobile Navigation Toggle
    const menuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    }

    // 3. Real-time Clock Update
    function updateLiveClock() {
        const timeDisplay = document.getElementById('liveTimeDisplay');
        const footerTime = document.getElementById('footerTimeDisplay');

        const now = new Date();
        const options = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        };

        const formattedDate = now.toLocaleString('en-GB', options);

        if (timeDisplay) {
            timeDisplay.textContent = formattedDate;
        }
        if (footerTime) {
            footerTime.textContent = formattedDate;
        }

        checkTimeBasedResults();
    }

    // 4. Markets Master Data
    const defaultMarketsData = [
        { id: "DS", name: "DISAWAR", timeStr: "05:00 AM", hour: 5, minute: 0, oldNum: "22", newNum: "27", tableIdx: 1, colIdx: 5 },
        { id: "HK", name: "HARYANA KING", timeStr: "01:30 PM", hour: 13, minute: 30, oldNum: "02", newNum: "84", tableIdx: 0, colIdx: 1 },
        { id: "RB", name: "RAM BAZAR", timeStr: "02:30 PM", hour: 14, minute: 30, oldNum: "83", newNum: "45", tableIdx: 0, colIdx: 2 },
        { id: "DB", name: "DELHI BAZAR", timeStr: "03:10 PM", hour: 15, minute: 10, oldNum: "71", newNum: "71", tableIdx: 0, colIdx: 3 },
        { id: "SG", name: "SHREE GANESH", timeStr: "04:40 PM", hour: 16, minute: 40, oldNum: "06", newNum: "39", tableIdx: 0, colIdx: 4 },
        { id: "FB", name: "FARIDABAD", timeStr: "06:10 PM", hour: 18, minute: 10, oldNum: "08", newNum: "99", tableIdx: 0, colIdx: 5 },
        { id: "AK", name: "AMBALA KING", timeStr: "07:30 PM", hour: 19, minute: 30, oldNum: "15", newNum: "62", tableIdx: 1, colIdx: 1 },
        { id: "GZ", name: "GAZIYABAD", timeStr: "10:00 PM", hour: 22, minute: 0, oldNum: "71", newNum: "89", tableIdx: 1, colIdx: 2 },
        { id: "HN", name: "HIMACHAL NIGHT", timeStr: "10:40 PM", hour: 22, minute: 40, oldNum: "92", newNum: "08", tableIdx: 1, colIdx: 3 },
        { id: "GL", name: "GALI", timeStr: "12:00 AM", hour: 24, minute: 0, oldNum: "12", newNum: "83", tableIdx: 1, colIdx: 4 }
    ];

    function getStoredResults() {
        try {
            const saved = localStorage.getItem('fastsatta_live_results');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('LocalStorage read error:', e);
        }
        return {};
    }

    async function syncFirebaseResults() {
        const firebaseUrl = "https://fastsatta-online-default-rtdb.firebaseio.com/results.json";
        try {
            const response = await fetch(firebaseUrl);
            if (response.ok) {
                const fbData = await response.json();
                if (fbData) {
                    localStorage.setItem('fastsatta_live_results', JSON.stringify(fbData));
                    checkTimeBasedResults();
                }
            }
        } catch (e) {}
    }

    function checkTimeBasedResults() {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTotalMins = currentHours * 60 + currentMinutes;

        const storedResults = getStoredResults();
        const resultCards = document.querySelectorAll('.live-cards-container .card-result-row');
        let activeMarketList = [];

        resultCards.forEach((card, index) => {
            const newSpan = card.querySelector('.new-val');
            const oldSpan = card.querySelector('.old-val');
            const market = defaultMarketsData[index];

            if (newSpan && market) {
                const targetMins = market.hour * 60 + market.minute;
                const waitStartMins = targetMins - 60; // 1 Hour Before Result Time

                const adminData = storedResults[market.name];
                let isExplicitDeclared = false;
                let numValue = "--";
                let updateTime = 0;

                if (adminData) {
                    if (adminData.oldNum && oldSpan) {
                        oldSpan.textContent = `{ ${adminData.oldNum} }`;
                    }
                    if (adminData.status === "DECLARED") {
                        isExplicitDeclared = true;
                        numValue = adminData.newNum;
                        updateTime = adminData.timestamp || targetMins;
                    } else if (adminData.status === "RESET") {
                        isExplicitDeclared = false;
                        numValue = "--";
                    }
                }

                let state = "PENDING";
                let displayVal = "";

                // ADMIN-ONLY CONTROL: Only show declared number if admin explicitly published it!
                if (isExplicitDeclared) {
                    state = "DECLARED";
                    displayVal = numValue;
                    newSpan.textContent = `[ ${numValue} ]`;
                    newSpan.classList.remove('blink-wait');
                    newSpan.style.color = "#16A34A";
                    newSpan.style.fontWeight = "900";

                    updateTodayTableCell(market.tableIdx, market.colIdx, numValue);
                } else if (currentTotalMins >= waitStartMins) {
                    // Past time or within 1 hour countdown without admin publish -> Show "Wait..."
                    state = "WAITING";
                    displayVal = "Wait...";
                    newSpan.textContent = "Wait...";
                    newSpan.classList.add('blink-wait');
                    newSpan.style.color = "#FF0000";

                    updateTodayTableCell(market.tableIdx, market.colIdx, "Wait...");
                } else {
                    // Future time before 1 hour countdown -> Show "--"
                    state = "PENDING";
                    displayVal = "--";
                    newSpan.textContent = "[ -- ]";
                    newSpan.classList.remove('blink-wait');
                    newSpan.style.color = "#000000";

                    updateTodayTableCell(market.tableIdx, market.colIdx, "--");
                }

                activeMarketList.push({
                    name: market.name,
                    timeStr: market.timeStr,
                    state: state,
                    num: displayVal,
                    targetMins: targetMins,
                    updateTime: updateTime
                });
            }
        });

        updateDynamicSpotHighlights(activeMarketList, currentTotalMins);
    }

    function updateTodayTableCell(tableIdx, colIndex, value) {
        const historyTables = document.querySelectorAll('.history-table');
        if (historyTables && historyTables[tableIdx]) {
            const todayRow = historyTables[tableIdx].querySelector('tbody tr.today-row');
            if (todayRow && todayRow.cells[colIndex]) {
                todayRow.cells[colIndex].textContent = value;
                if (value !== "--" && value !== "Wait...") {
                    todayRow.cells[colIndex].style.color = "#16A34A";
                    todayRow.cells[colIndex].style.fontWeight = "900";
                } else {
                    todayRow.cells[colIndex].style.color = "#000000";
                    todayRow.cells[colIndex].style.fontWeight = "normal";
                }
            }
        }
    }

    function updateDynamicSpotHighlights(marketList, currentTotalMins) {
        const spotContainer = document.querySelector('.spot-results-container');
        if (!spotContainer) return;

        // 1. Waiting Markets (currently in 1-hour window or past time awaiting admin publish)
        const waitingMarkets = marketList.filter(m => m.state === "WAITING").sort((a, b) => a.targetMins - b.targetMins);

        // 2. Admin-Declared Markets sorted strictly by publish timestamp / declaration time descending (latest published first)
        const declaredMarkets = marketList.filter(m => m.state === "DECLARED").sort((a, b) => b.updateTime - a.updateTime || b.targetMins - a.targetMins);

        // 3. Upcoming Pending Markets
        const pendingMarkets = marketList.filter(m => m.state === "PENDING").sort((a, b) => a.targetMins - b.targetMins);

        let selectedTop2 = [];

        // STRICT SPOTLIGHT HIERARCHY:
        if (waitingMarkets.length > 0) {
            // Waiting market gets Slot #1
            selectedTop2.push(waitingMarkets[0]);

            if (waitingMarkets.length > 1) {
                selectedTop2.push(waitingMarkets[1]);
            } else if (declaredMarkets.length > 0) {
                // Latest published market gets Slot #2
                selectedTop2.push(declaredMarkets[0]);
            } else if (pendingMarkets.length > 0) {
                selectedTop2.push(pendingMarkets[0]);
            }
        } else if (declaredMarkets.length >= 2) {
            // Show 2 most recently published markets
            selectedTop2.push(declaredMarkets[0]);
            selectedTop2.push(declaredMarkets[1]);
        } else if (declaredMarkets.length === 1) {
            selectedTop2.push(declaredMarkets[0]);
            if (pendingMarkets.length > 0) {
                selectedTop2.push(pendingMarkets[0]);
            }
        } else if (pendingMarkets.length >= 2) {
            selectedTop2.push(pendingMarkets[0]);
            selectedTop2.push(pendingMarkets[1]);
        }

        // Render Spotlight HTML
        if (selectedTop2.length >= 2) {
            const m1 = selectedTop2[0];
            const m2 = selectedTop2[1];

            const val1Class = m1.state === "WAITING" ? "blink-wait" : "green-result-number";
            const val2Class = m2.state === "WAITING" ? "blink-wait" : "green-result-number";

            spotContainer.innerHTML = `
                <div class="pink-market-name">${m1.name}</div>
                <div class="${val1Class}">${m1.num}</div>

                <div class="pink-market-name">${m2.name}</div>
                <div class="${val2Class}">${m2.num}</div>
            `;
        } else if (selectedTop2.length === 1) {
            const m1 = selectedTop2[0];
            const val1Class = m1.state === "WAITING" ? "blink-wait" : "green-result-number";

            spotContainer.innerHTML = `
                <div class="pink-market-name">${m1.name}</div>
                <div class="${val1Class}">${m1.num}</div>
            `;
        }
    }

    // 5. Automated Daily Row Creation Generator
    function ensureTodayRowExists() {
        const now = new Date();
        const todayDay = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const yearNum = now.getFullYear();
        const todayDateStr = `${todayDay}-${monthNum}-${yearNum}`;

        const tables = document.querySelectorAll('.history-table tbody');
        tables.forEach(tbody => {
            let rowFound = false;
            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                const dateCell = row.cells[0];
                if (dateCell && dateCell.textContent.startsWith(todayDay)) {
                    rowFound = true;
                    row.classList.add('today-row');
                } else {
                    row.classList.remove('today-row');
                }
            });

            if (!rowFound) {
                const newTr = document.createElement('tr');
                newTr.classList.add('today-row');

                let tdHTML = `<td class="date-cell">${todayDateStr}</td>`;
                for (let i = 0; i < 5; i++) {
                    tdHTML += `<td>--</td>`;
                }
                newTr.innerHTML = tdHTML;
                tbody.appendChild(newTr);
            }
        });
    }

    ensureTodayRowExists();

    syncFirebaseResults();
    setInterval(syncFirebaseResults, 3000);

    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    const refreshBtns = document.querySelectorAll('#refreshBtn');
    refreshBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
            setTimeout(() => {
                syncFirebaseResults();
                checkTimeBasedResults();
                window.location.reload();
            }, 300);
        });
    });
});
