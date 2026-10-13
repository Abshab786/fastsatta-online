/*
   FASTSATTA.ONLINE - Dynamic Spot Highlights, Chart Overrides & Local/Firebase Sync
*/

document.addEventListener('DOMContentLoaded', () => {

    // HARD PURGE stale LocalStorage keys on load
    try {
        localStorage.removeItem('fastsatta_live_results');
    } catch(e) {}

    // Helper: Compute Date & Time strictly in Asia/Kolkata (IST - UTC+05:30)
    function getKolkataDateInfo() {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(now);
        const dateMap = {};
        parts.forEach(p => dateMap[p.type] = p.value);

        const d = dateMap.day;
        const m = dateMap.month;
        const y = dateMap.year;

        const formattedDash = `${d}-${m}-${y}`; // e.g. "13-10-2026"
        const isoDash = `${y}-${m}-${d}`;       // e.g. "2026-10-13"

        const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yParts = formatter.formatToParts(yesterdayDate);
        const yMap = {};
        yParts.forEach(p => yMap[p.type] = p.value);
        const yesterdayFormattedDash = `${yMap.day}-${yMap.month}-${yMap.year}`;
        const yesterdayIsoDash = `${yMap.year}-${yMap.month}-${yMap.day}`;

        const fullFormatter = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const fullDateStr = fullFormatter.format(now);

        const hours = parseInt(dateMap.hour, 10);
        const minutes = parseInt(dateMap.minute, 10);
        const totalMinutes = hours * 60 + minutes;

        return {
            todayDay: d,
            formattedDash: formattedDash,
            isoDash: isoDash,
            yesterdayFormattedDash: yesterdayFormattedDash,
            yesterdayIsoDash: yesterdayIsoDash,
            fullDateStr: fullDateStr,
            hours: hours,
            minutes: minutes,
            totalMinutes: totalMinutes
        };
    }

    // 1. Dynamic SEO Title & Meta Description Sync
    const dateInfo = getKolkataDateInfo();

    if (document.title.includes('[Current Date]')) {
        document.title = document.title.replace('[Current Date]', dateInfo.fullDateStr);
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && metaDesc.content.includes('[Current Date]')) {
        metaDesc.content = metaDesc.content.replace(/\[Current Date\]/g, dateInfo.fullDateStr);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content.includes('[Current Date]')) {
        ogTitle.content = ogTitle.content.replace('[Current Date]', dateInfo.fullDateStr);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && ogDesc.content.includes('[Current Date]')) {
        ogDesc.content = ogDesc.content.replace(/\[Current Date\]/g, dateInfo.fullDateStr);
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
        applyChartCustomOverrides();
    }

    // 4. Markets Master Config
    const defaultMarketsData = [
        { id: "DS", name: "DISAWAR", timeStr: "05:00 AM", hour: 5, minute: 0, oldNum: "27", tableIdx: 1, colIdx: 5 },
        { id: "HK", name: "HARYANA KING", timeStr: "01:30 PM", hour: 13, minute: 30, oldNum: "19", tableIdx: 0, colIdx: 1 },
        { id: "RB", name: "RAM BAZAR", timeStr: "02:30 PM", hour: 14, minute: 30, oldNum: "73", tableIdx: 0, colIdx: 2 },
        { id: "DB", name: "DELHI BAZAR", timeStr: "03:10 PM", hour: 15, minute: 10, oldNum: "50", tableIdx: 0, colIdx: 3 },
        { id: "SG", name: "SHREE GANESH", timeStr: "04:40 PM", hour: 16, minute: 40, oldNum: "58", tableIdx: 0, colIdx: 4 },
        { id: "FB", name: "FARIDABAD", timeStr: "06:10 PM", hour: 18, minute: 10, oldNum: "96", tableIdx: 0, colIdx: 5 },
        { id: "AK", name: "AMBALA KING", timeStr: "07:30 PM", hour: 19, minute: 30, oldNum: "21", tableIdx: 1, colIdx: 1 },
        { id: "GZ", name: "GAZIYABAD", timeStr: "10:00 PM", hour: 22, minute: 0, oldNum: "46", tableIdx: 1, colIdx: 2 },
        { id: "HN", name: "HIMACHAL NIGHT", timeStr: "10:40 PM", hour: 22, minute: 40, oldNum: "19", tableIdx: 1, colIdx: 3 },
        { id: "GL", name: "GALI", timeStr: "12:00 AM", hour: 0, minute: 0, oldNum: "40", tableIdx: 1, colIdx: 4 }
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
        const firebaseUrl = "https://fastsatta-online-default-rtdb.asia-southeast1.firebasedatabase.app/results.json";
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

        // Sync Custom Chart Overrides from Firebase
        const chartFirebaseUrl = "https://fastsatta-online-default-rtdb.asia-southeast1.firebasedatabase.app/chart_overrides.json";
        try {
            const response2 = await fetch(chartFirebaseUrl);
            if (response2.ok) {
                const chartData = await response2.json();
                if (chartData) {
                    let mapData = {};
                    for (const k in chartData) {
                        if (chartData[k] && chartData[k].num) {
                            mapData[k] = chartData[k].num;
                        }
                    }
                    localStorage.setItem('fastsatta_chart_overrides', JSON.stringify(mapData));
                    applyChartCustomOverrides();
                }
            }
        } catch (e) {}
    }

    function checkTimeBasedResults() {
        const info = getKolkataDateInfo();
        const currentMins = info.totalMinutes;

        const storedResults = getStoredResults();
        const resultCards = document.querySelectorAll('.live-cards-container .card-result-row');
        let activeMarketList = [];

        resultCards.forEach((card, index) => {
            const newSpan = card.querySelector('.new-val');
            const oldSpan = card.querySelector('.old-val');
            const market = defaultMarketsData[index];

            if (newSpan && market) {
                const targetMins = market.hour * 60 + market.minute;
                const waitStartMins = targetMins === 0 ? 1380 : targetMins - 60; // 11:00 PM for Gali

                let yesterdayNumToShow = market.oldNum;
                let isTodayDeclared = false;
                let todayNumValue = "--";

                const adminData = storedResults[market.name];

                if (adminData) {
                    const pubDate = adminData.date || "";

                    if (pubDate === info.formattedDash || pubDate === info.isoDash) {
                        if (adminData.oldNum && adminData.oldNum !== "--") {
                            yesterdayNumToShow = adminData.oldNum;
                        }
                        if (adminData.newNum && adminData.newNum !== "--" && adminData.newNum.trim() !== "" && adminData.status !== "RESET") {
                            isTodayDeclared = true;
                            todayNumValue = adminData.newNum;
                        }
                    } else if (pubDate === info.yesterdayFormattedDash || pubDate === info.yesterdayIsoDash) {
                        if (adminData.newNum && adminData.newNum !== "--" && adminData.status !== "RESET") {
                            yesterdayNumToShow = adminData.newNum;
                            updateSpecificDateTableCell(market.tableIdx, market.colIdx, info.yesterdayFormattedDash, adminData.newNum);
                        }
                    }
                }

                if (oldSpan) {
                    oldSpan.textContent = `{ ${yesterdayNumToShow} }`;
                }

                let state = "PENDING";
                let displayVal = "";

                const isGaliWaitingWindow = (targetMins === 0 && currentMins >= 1380);
                const isOtherWaitingWindow = (targetMins > 0 && currentMins >= waitStartMins && currentMins < targetMins);

                if (isTodayDeclared) {
                    state = "DECLARED";
                    displayVal = todayNumValue;
                    newSpan.textContent = `[ ${todayNumValue} ]`;
                    newSpan.classList.remove('blink-wait');
                    newSpan.style.color = "#16A34A";
                    newSpan.style.fontWeight = "900";

                    updateTodayTableCell(market.tableIdx, market.colIdx, todayNumValue);
                } else if (isGaliWaitingWindow || isOtherWaitingWindow) {
                    state = "WAITING";
                    displayVal = "Wait...";
                    newSpan.textContent = "Wait...";
                    newSpan.classList.add('blink-wait');
                    newSpan.style.color = "#FF0000";

                    updateTodayTableCell(market.tableIdx, market.colIdx, "Wait...");
                } else {
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
                    lastDeclaredNum: yesterdayNumToShow,
                    oldNum: market.oldNum,
                    targetMins: targetMins
                });
            }
        });

        updateDynamicSpotHighlights(activeMarketList, currentMins);
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

    function updateSpecificDateTableCell(tableIdx, colIndex, dateStr, value) {
        const dayPart = dateStr.split('-')[0];
        const historyTables = document.querySelectorAll('.history-table');
        if (historyTables && historyTables[tableIdx]) {
            const rows = historyTables[tableIdx].querySelectorAll('tbody tr');
            rows.forEach(row => {
                const dateCell = row.cells[0];
                if (dateCell && dateCell.textContent.startsWith(dayPart)) {
                    if (row.cells[colIndex]) {
                        row.cells[colIndex].textContent = value;
                        row.cells[colIndex].style.color = "#16A34A";
                        row.cells[colIndex].style.fontWeight = "900";
                    }
                }
            });
        }
    }

    // Apply Admin Custom Chart Record Overrides
    function applyChartCustomOverrides() {
        try {
            const savedOverrides = localStorage.getItem('fastsatta_chart_overrides');
            if (savedOverrides) {
                const overrides = JSON.parse(savedOverrides);
                for (const key in overrides) {
                    const parts = key.split('_'); // e.g. ["11", "GALI"]
                    const dayPart = parts[0];
                    const marketName = parts[1];
                    const customNum = overrides[key];

                    const foundMarket = defaultMarketsData.find(m => m.name === marketName);
                    if (foundMarket) {
                        updateSpecificDateTableCell(foundMarket.tableIdx, foundMarket.colIdx, dayPart, customNum);
                    }
                }
            }
        } catch(e) {}
    }

    // Dynamic Sequential Spotlight Engine
    function updateDynamicSpotHighlights(marketList, currentTotalMins) {
        const spotContainer = document.querySelector('.spot-results-container');
        if (!spotContainer) return;

        let spotPin = null;
        try {
            const savedPin = localStorage.getItem('fastsatta_spotlight_pin');
            if (savedPin) {
                const parsedPin = JSON.parse(savedPin);
                if (parsedPin.active) {
                    if (parsedPin.expireTime > 0 && Date.now() > parsedPin.expireTime) {
                        localStorage.removeItem('fastsatta_spotlight_pin');
                    } else {
                        spotPin = parsedPin;
                    }
                }
            }
        } catch(e) {}

        let sortedByProximity = [...marketList].sort((a, b) => {
            if (a.state === "WAITING" && b.state !== "WAITING") return -1;
            if (b.state === "WAITING" && a.state !== "WAITING") return 1;

            if (a.state === "DECLARED" && b.state === "PENDING") return -1;
            if (b.state === "DECLARED" && a.state === "PENDING") return 1;

            let diffA = Math.abs(a.targetMins - currentTotalMins);
            let diffB = Math.abs(b.targetMins - currentTotalMins);

            if (a.targetMins === 0 && currentTotalMins < 300) diffA = currentTotalMins;
            if (b.targetMins === 0 && currentTotalMins < 300) diffB = currentTotalMins;

            return diffA - diffB;
        });

        let m1 = sortedByProximity[0];
        let m2 = sortedByProximity[1];

        if (spotPin) {
            if (spotPin.m1 && spotPin.m1 !== "AUTO") {
                const found1 = marketList.find(m => m.name === spotPin.m1);
                if (found1) {
                    m1 = { ...found1 };
                    if (spotPin.s1 === "WAITING") m1.state = "WAITING";
                    else if (spotPin.s1 === "DECLARED") m1.state = "DECLARED";
                    else if (spotPin.s1 === "PENDING") m1.state = "PENDING";
                }
            }

            if (spotPin.m2 && spotPin.m2 !== "AUTO") {
                const found2 = marketList.find(m => m.name === spotPin.m2);
                if (found2) {
                    m2 = { ...found2 };
                    if (spotPin.s2 === "WAITING") m2.state = "WAITING";
                    else if (spotPin.s2 === "DECLARED") m2.state = "DECLARED";
                    else if (spotPin.s2 === "PENDING") m2.state = "PENDING";
                }
            }
        }

        if (m1 && m2) {
            let val1Num = m1.num;
            if (val1Num === "--" || val1Num === "Wait...") {
                val1Num = (m1.lastDeclaredNum && m1.lastDeclaredNum !== "--") ? m1.lastDeclaredNum : m1.oldNum;
            }

            let val2Num = m2.num;
            if (val2Num === "--" || val2Num === "Wait...") {
                val2Num = (m2.lastDeclaredNum && m2.lastDeclaredNum !== "--") ? m2.lastDeclaredNum : m2.oldNum;
            }

            const val1Display = m1.state === "DECLARED" ? `[ ${val1Num} ]` : (m1.state === "WAITING" ? "Wait..." : "--");
            const val1Class = m1.state === "WAITING" ? "blink-wait" : (m1.state === "DECLARED" ? "green-result-number" : "green-result-number");
            const val1Style = m1.state === "PENDING" ? 'style="color: #000000; font-weight: bold;"' : '';

            const val2Display = m2.state === "DECLARED" ? `[ ${val2Num} ]` : (m2.state === "WAITING" ? "Wait..." : "--");
            const val2Class = m2.state === "WAITING" ? "blink-wait" : (m2.state === "DECLARED" ? "green-result-number" : "green-result-number");
            const val2Style = m2.state === "PENDING" ? 'style="color: #000000; font-weight: bold;"' : '';

            spotContainer.innerHTML = `
                <div class="pink-market-name">${m1.name}</div>
                <div class="${val1Class}" ${val1Style}>${val1Display}</div>

                <div class="pink-market-name">${m2.name}</div>
                <div class="${val2Class}" ${val2Style}>${val2Display}</div>
            `;
        }
    }

    function ensureTodayRowExists() {
        const info = getKolkataDateInfo();

        const tables = document.querySelectorAll('.history-table tbody');
        tables.forEach(tbody => {
            let rowFound = false;
            const rows = tbody.querySelectorAll('tr');

            rows.forEach(row => {
                const dateCell = row.cells[0];
                if (dateCell && dateCell.textContent.startsWith(info.todayDay)) {
                    rowFound = true;
                    row.classList.add('today-row');
                } else {
                    row.classList.remove('today-row');
                }
            });

            if (!rowFound) {
                const newTr = document.createElement('tr');
                newTr.classList.add('today-row');

                let tdHTML = `<td class="date-cell">${info.formattedDash}</td>`;
                for (let i = 0; i < 5; i++) {
                    tdHTML += `<td>--</td>`;
                }
                newTr.innerHTML = tdHTML;
                tbody.appendChild(newTr);
            }
        });
    }

    ensureTodayRowExists();
    applyChartCustomOverrides();

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
                applyChartCustomOverrides();
                window.location.reload();
            }, 300);
        });
    });
});
