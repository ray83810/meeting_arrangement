document.addEventListener("DOMContentLoaded", () => {
    // State management
    let initData = { months: [], agents: [] };
    let scheduleResult = null;
    let scheduleHistory = [];
    let selectedDate = null;
    let activeHeatmapMode = "after"; // "before" or "after"
    let uploadedMonthCode = null;

    // DOM Elements
    const loadedMonthGroup = document.getElementById("loaded-month-group");
    const loadedMonthVal = document.getElementById("loaded-month-val");
    const submitBtn = document.getElementById("submit-btn");
    const appendBtn = document.getElementById("append-btn");
    const undoBtn = document.getElementById("undo-btn");
    const clearBtn = document.getElementById("clear-btn");
    
    const agentCheckboxes = document.getElementById("agent-checkboxes");
    const selectAllBtn = document.getElementById("select-all-btn");
    const deselectAllBtn = document.getElementById("deselect-all-btn");
    const courseCountInput = document.getElementById("course-count-input");
    const jointClassCheckbox = document.getElementById("joint-class-checkbox");
    const scheduleForm = document.getElementById("schedule-form");
    
    // Num input nav
    const numUp = document.querySelector(".num-nav .up");
    const numDown = document.querySelector(".num-nav .down");

    // Tab buttons and panels
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    const emptyState = document.getElementById("empty-state");
    const statsSection = document.getElementById("stats-section");
    const loadingOverlay = document.getElementById("loading-overlay");

    // Calendar Elements
    const calendarGrid = document.getElementById("calendar-grid");
    const calendarMonthTitle = document.getElementById("calendar-month-title");
    const dayDetailEmpty = document.getElementById("day-detail-empty");
    const dayDetailContent = document.getElementById("day-detail-content");
    const selectedDateTitle = document.getElementById("selected-date-title");
    const selectedDateWeekday = document.getElementById("selected-date-weekday");
    const dayCoursesList = document.getElementById("day-courses-list");
    const dayCoverageTimeline = document.getElementById("day-coverage-timeline");

    // Heatmap Elements
    const heatmapCells = document.getElementById("heatmap-cells");
    const toggleHeatmapBefore = document.getElementById("toggle-heatmap-before");
    const toggleHeatmapAfter = document.getElementById("toggle-heatmap-after");

    // List Elements
    const scheduleTableBody = document.getElementById("schedule-table-body");
    const failedCoursesSection = document.getElementById("failed-courses-section");
    const failedCoursesList = document.getElementById("failed-courses-list");
    const exportCsvBtn = document.getElementById("export-csv-btn");

    // Upload Elements
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");
    const fileNameText = document.getElementById("file-name-text");
    const uploadStatus = document.getElementById("upload-status");

    // Initialize application data in upload-only mode
    initUploadOnlyMode();

    // Event Listeners - Checkbox select controls
    selectAllBtn.addEventListener("click", () => toggleAllCheckboxes(true));
    deselectAllBtn.addEventListener("click", () => toggleAllCheckboxes(false));

    // Event Listeners - Number input up/down
    numUp.addEventListener("click", () => {
        courseCountInput.stepUp();
    });
    numDown.addEventListener("click", () => {
        courseCountInput.stepDown();
    });

    // Upload interactions
    uploadZone.addEventListener("click", () => fileInput.click());
    
    fileInput.addEventListener("change", (e) => {
        if (fileInput.files.length > 0) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    // Drag and drop setup
    ["dragenter", "dragover"].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadZone.classList.add("dragover");
        }, false);
    });

    ["dragleave", "drop"].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            uploadZone.classList.remove("dragover");
        }, false);
    });

    uploadZone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    const SHIFTS_ALL = [
        "Alex Chen", "Amber Wang", "Evan Liu", "Howard Chen", 
        "Jacky Lee", "Jian Kai Ding", "Molly Song", "Rex Liao", "Sherry Lin"
    ];

    const AGENT_MAP = {
        "alex chen": "Alex Chen",
        "amber wang": "Amber Wang",
        "evan liu": "Evan Liu",
        "howard chen": "Howard Chen",
        "jacky lee": "Jacky Lee",
        "jian kai ding": "Jian Kai Ding",
        "kai din": "Jian Kai Ding",
        "jiankai.ding": "Jian Kai Ding",
        "kai ding": "Jian Kai Ding",
        "molly song": "Molly Song",
        "rex liao": "Rex Liao",
        "rex laio": "Rex Liao",
        "sherry lin": "Sherry Lin"
    };

    function normalizeName(rawName) {
        if (!rawName) return null;
        const clean = rawName.toString().trim().toLowerCase().replace(/\s+/g, ' ');
        return AGENT_MAP[clean] || null;
    }

    function getAgentShiftHours(shiftStr) {
        if (!shiftStr) return null;
        const s = shiftStr.toString().trim();
        if (s === "OFF" || s === "PTO" || s === "ST") return null;
        const match = s.match(/(\d{2}):(\d{2})/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return null;
    }

    function parseMealHours(mealVal, startHour) {
        if (!mealVal) {
            return [(startHour + 4) % 24]; // default to 5th hour (index 4)
        }
        const s = mealVal.toString().trim();
        const matches = [...s.matchAll(/(\d{2}):(\d{2})/g)];
        if (matches.length > 0) {
            return matches.map(m => parseInt(m[1], 10));
        }
        return [(startHour + 4) % 24];
    }

    function handleFileUpload(file) {
        if (!file.name.endsWith(".xlsx")) {
            showUploadStatus("僅支援 .xlsx 格式的 Excel 檔案！", "error");
            return;
        }

        fileNameText.textContent = file.name;
        showUploadStatus("正在解析檔案...", "loading");

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                
                // Find sheet name starting with "20"
                const sheetNames = workbook.SheetNames.filter(name => name.startsWith("20"));
                if (sheetNames.length === 0) {
                    showUploadStatus("Excel 檔案中找不到以 '20' 開頭的班表分頁 (例如 202606)", "error");
                    return;
                }
                
                const sheetName = sheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                // Extract month code
                let monthCode = "";
                const monthMatch = file.name.match(/\d{6}/);
                if (monthMatch) {
                    monthCode = monthMatch[0];
                } else {
                    if (sheetName.length === 6 && /^\d+$/.test(sheetName)) {
                        monthCode = sheetName;
                    } else {
                        const digits = sheetName.replace(/\D/g, "");
                        if (digits.length === 6) {
                            monthCode = digits;
                        } else {
                            monthCode = file.name.replace(".xlsx", "");
                        }
                    }
                }
                
                const range = XLSX.utils.decode_range(sheet['!ref']);
                const dates = [];
                for (let c = 9; c <= range.e.c; c++) {
                    const cell = sheet[XLSX.utils.encode_cell({ r: 1, c: c })];
                    let val = cell ? cell.v : null;
                    if (val instanceof Date) {
                        // Add 12 hours offset to avoid any timezone changes pushing it to wrong day
                        const adjustedVal = new Date(val.getTime() + 12 * 60 * 60 * 1000);
                        const year = adjustedVal.getFullYear();
                        const month = String(adjustedVal.getMonth() + 1).padStart(2, '0');
                        const day = String(adjustedVal.getDate()).padStart(2, '0');
                        dates.push(`${year}-${month}-${day}`);
                    } else if (val) {
                        dates.push(val.toString().trim());
                    } else {
                        dates.push("");
                    }
                }
                
                const validDates = dates.filter(d => d && d.length === 10 && d[4] === '-' && d[7] === '-');
                if (validDates.length < 15) {
                    showUploadStatus("班表格式不符：在 Row 2 第 10 欄之後找不到足夠的日期資料", "error");
                    return;
                }
                
                const colMapping = {};
                dates.forEach((d_str, idx) => {
                    if (validDates.includes(d_str)) {
                        colMapping[d_str] = 9 + idx;
                    }
                });
                
                const agentsData = {};
                for (let r = 2; r <= range.e.r; r++) {
                    const cellA = sheet[XLSX.utils.encode_cell({ r: r, c: 0 })];
                    const rawName = cellA ? cellA.v : null;
                    const name = normalizeName(rawName);
                    if (name && SHIFTS_ALL.includes(name)) {
                        const cellB = sheet[XLSX.utils.encode_cell({ r: r, c: 1 })];
                        const defaultShift = cellB ? cellB.v : null;
                        
                        const cellD = sheet[XLSX.utils.encode_cell({ r: r, c: 3 })];
                        const mealVal = cellD ? cellD.v : null;
                        
                        const dailySchedule = {};
                        validDates.forEach(d_str => {
                            const col = colMapping[d_str];
                            const cellVal = sheet[XLSX.utils.encode_cell({ r: r, c: col })];
                            dailySchedule[d_str] = cellVal ? cellVal.v : null;
                        });
                        
                        agentsData[name] = {
                            default_shift: defaultShift,
                            meal: mealVal,
                            schedule: dailySchedule
                        };
                    }
                }
                
                uploadedMonthCode = monthCode;
                scheduleResult = null;
                scheduleHistory = [];
                appendBtn.disabled = true;
                appendBtn.style.opacity = "0.5";
                appendBtn.style.cursor = "not-allowed";
                undoBtn.disabled = true;
                undoBtn.style.opacity = "0.5";
                undoBtn.style.cursor = "not-allowed";
                clearBtn.disabled = true;
                clearBtn.style.opacity = "0.5";
                clearBtn.style.cursor = "not-allowed";
                
                initData = {
                    dates: validDates,
                    agents: agentsData
                };
                
                const yearStr = monthCode.substring(0, 4);
                const monthStr = monthCode.substring(4);
                
                showUploadStatus("班表解析成功！", "success");
                
                loadedMonthVal.textContent = `${yearStr}年${monthStr}月`;
                loadedMonthGroup.style.display = "block";
                
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
                submitBtn.style.boxShadow = "0 4px 12px rgba(13, 148, 136, 0.3)";
                
                const parsedAgents = Object.keys(agentsData).sort();
                agentCheckboxes.innerHTML = "";
                parsedAgents.forEach(agent => {
                    const label = document.createElement("label");
                    label.className = "checkbox-label";
                    
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.name = "agents";
                    input.value = agent;
                    input.checked = true;
                    
                    label.appendChild(input);
                    label.appendChild(document.createTextNode(" " + agent));
                    agentCheckboxes.appendChild(label);
                });
                
            } catch (err) {
                console.error("Error reading file:", err);
                showUploadStatus("解析 Excel 失敗：" + err.message, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showUploadStatus(msg, type) {
        uploadStatus.className = "upload-status " + type;
        uploadStatus.textContent = msg;
    }

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-tab");
            
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            tabPanels.forEach(panel => {
                panel.classList.add("hidden");
            });

            if (scheduleResult) {
                document.getElementById(targetTab).classList.remove("hidden");
            } else {
                emptyState.classList.remove("hidden");
            }
        });
    });

    // Heatmap mode toggles
    toggleHeatmapBefore.addEventListener("click", () => {
        toggleHeatmapBefore.classList.add("active");
        toggleHeatmapAfter.classList.remove("active");
        activeHeatmapMode = "before";
        renderHeatmap();
    });

    toggleHeatmapAfter.addEventListener("click", () => {
        toggleHeatmapAfter.classList.add("active");
        toggleHeatmapBefore.classList.remove("active");
        activeHeatmapMode = "after";
        renderHeatmap();
    });

    // Form submission for schedule calculation
    scheduleForm.addEventListener("submit", (e) => {
        e.preventDefault();
        calculateSchedule(false);
    });

    // Append calculation
    appendBtn.addEventListener("click", () => {
        calculateSchedule(true);
    });

    // Undo action
    undoBtn.addEventListener("click", () => {
        undoSchedule();
    });

    // Clear action
    clearBtn.addEventListener("click", () => {
        clearSchedule();
    });

    // Export CSV
    exportCsvBtn.addEventListener("click", exportToCSV);


    // Initialize upload-only mode view
    function initUploadOnlyMode() {
        // Show placeholder in checklist
        agentCheckboxes.innerHTML = '<div class="help-text" style="padding: 10px 0; color: var(--text-muted);"><i class="fa-solid fa-circle-info"></i> 請先上傳班表 Excel 檔案以載入客服同仁名單。</div>';
        
        // Disable submit button by default
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
        submitBtn.style.boxShadow = "none";

        appendBtn.disabled = true;
        appendBtn.style.opacity = "0.5";
        appendBtn.style.cursor = "not-allowed";

        undoBtn.disabled = true;
        undoBtn.style.opacity = "0.5";
        undoBtn.style.cursor = "not-allowed";

        clearBtn.disabled = true;
        clearBtn.style.opacity = "0.5";
        clearBtn.style.cursor = "not-allowed";
    }

    function toggleAllCheckboxes(checked) {
        const checkboxes = document.querySelectorAll("#agent-checkboxes input");
        checkboxes.forEach(cb => {
            cb.checked = checked;
        });
    }

    // Submit scheduling criteria to API
    function calculateSchedule(isAppend = false) {
        const selectedMonth = uploadedMonthCode;
        if (!selectedMonth) {
            alert("請先上傳班表 Excel 檔案！");
            return;
        }
        const selectedAgents = Array.from(document.querySelectorAll("#agent-checkboxes input:checked")).map(cb => cb.value);
        const courseCount = parseInt(courseCountInput.value);
        const courseDuration = parseInt(document.querySelector('input[name="course-duration"]:checked').value);
        const minCoverage = parseInt(document.getElementById("coverage-select").value);

        if (selectedAgents.length === 0) {
            alert("請至少選擇一位客服人員！");
            return;
        }

        // Show loading state
        loadingOverlay.classList.remove("hidden");
        emptyState.classList.add("hidden");

        // Save current state to history for undo (serialize to JSON string to clone sets and nested objects)
        scheduleHistory.push(scheduleResult ? JSON.stringify(scheduleResult) : null);
        if (scheduleHistory.length > 15) {
            scheduleHistory.shift();
        }
        undoBtn.disabled = false;
        undoBtn.style.opacity = "1";
        undoBtn.style.cursor = "pointer";

        // Run JS Scheduler locally in browser!
        setTimeout(() => {
            try {
                const startingResult = isAppend ? scheduleResult : null;
                const result = calculateScheduleJS(selectedMonth, selectedAgents, courseCount, courseDuration, minCoverage, jointClassCheckbox.checked, startingResult);
                scheduleResult = result;
                
                // Hide loader and empty state
                loadingOverlay.classList.add("hidden");
                
                // Enable append and clear buttons
                appendBtn.disabled = false;
                appendBtn.style.opacity = "1";
                appendBtn.style.cursor = "pointer";
                
                clearBtn.disabled = false;
                clearBtn.style.opacity = "1";
                clearBtn.style.cursor = "pointer";
                
                // Update workspace header label
                const monthLabel = loadedMonthVal.textContent;
                
                // Calculate total scheduled sessions
                let totalCount = 0;
                Object.keys(scheduleResult.scheduled_courses).forEach(a => {
                    totalCount += scheduleResult.scheduled_courses[a].length;
                });
                
                document.getElementById("current-config-summary").textContent = 
                    `${monthLabel} 班表 | 已安排: ${totalCount}堂/次 | 安全在線門檻: ${minCoverage}位`;

                // Display active panels
                statsSection.classList.remove("hidden");
                
                const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-tab");
                tabPanels.forEach(panel => panel.classList.add("hidden"));
                document.getElementById(activeTab).classList.remove("hidden");

                // Clear side details
                selectedDate = null;
                dayDetailEmpty.classList.remove("hidden");
                dayDetailContent.classList.add("hidden");

                // Render metrics and panels
                renderStats(minCoverage);
                renderCalendar(selectedMonth);
                renderHeatmap();
                renderTable();
            } catch (err) {
                console.error("Scheduling error:", err);
                // Rollback history state since it errored
                scheduleHistory.pop();
                if (scheduleHistory.length === 0) {
                    undoBtn.disabled = true;
                    undoBtn.style.opacity = "0.5";
                    undoBtn.style.cursor = "not-allowed";
                }
                loadingOverlay.classList.add("hidden");
                emptyState.classList.remove("hidden");
                statsSection.classList.add("hidden");
                tabPanels.forEach(panel => panel.classList.add("hidden"));
                alert("錯誤: " + err.message);
            }
        }, 50);
    }

    // Restore to previous schedule state
    function undoSchedule() {
        if (scheduleHistory.length > 0) {
            const prevStateStr = scheduleHistory.pop();
            const prevState = prevStateStr ? JSON.parse(prevStateStr) : null;
            scheduleResult = prevState;
            
            if (scheduleHistory.length === 0) {
                undoBtn.disabled = true;
                undoBtn.style.opacity = "0.5";
                undoBtn.style.cursor = "not-allowed";
            }
            
            if (scheduleResult) {
                // Restore UI with results
                appendBtn.disabled = false;
                appendBtn.style.opacity = "1";
                appendBtn.style.cursor = "pointer";
                
                clearBtn.disabled = false;
                clearBtn.style.opacity = "1";
                clearBtn.style.cursor = "pointer";
                
                // Calculate total scheduled sessions
                let totalCount = 0;
                Object.keys(scheduleResult.scheduled_courses).forEach(a => {
                    totalCount += scheduleResult.scheduled_courses[a].length;
                });
                
                const minCoverage = parseInt(document.getElementById("coverage-select").value);
                const monthLabel = loadedMonthVal.textContent;
                document.getElementById("current-config-summary").textContent = 
                    `${monthLabel} 班表 | 已安排: ${totalCount}堂/次 | 安全在線門檻: ${minCoverage}位`;
                
                statsSection.classList.remove("hidden");
                const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-tab");
                tabPanels.forEach(panel => panel.classList.add("hidden"));
                document.getElementById(activeTab).classList.remove("hidden");
                
                renderStats(minCoverage);
                renderCalendar(uploadedMonthCode);
                renderHeatmap();
                renderTable();
            } else {
                // Restore to completely empty state
                appendBtn.disabled = true;
                appendBtn.style.opacity = "0.5";
                appendBtn.style.cursor = "not-allowed";
                
                clearBtn.disabled = true;
                clearBtn.style.opacity = "0.5";
                clearBtn.style.cursor = "not-allowed";
                
                statsSection.classList.add("hidden");
                tabPanels.forEach(panel => panel.classList.add("hidden"));
                emptyState.classList.remove("hidden");
                
                document.getElementById("current-config-summary").textContent = "請設定參數並開始安排。";
            }
            
            // Clear details panel
            selectedDate = null;
            dayDetailEmpty.classList.remove("hidden");
            dayDetailContent.classList.add("hidden");
        }
    }

    // Clear all arrangements
    function clearSchedule() {
        if (confirm("確定要清除所有已安排的課程/會議嗎？")) {
            // Push current state to undo history for safety
            if (scheduleResult) {
                scheduleHistory.push(JSON.stringify(scheduleResult));
                undoBtn.disabled = false;
                undoBtn.style.opacity = "1";
                undoBtn.style.cursor = "pointer";
            }
            
            scheduleResult = null;
            
            // Disable append and clear buttons
            appendBtn.disabled = true;
            appendBtn.style.opacity = "0.5";
            appendBtn.style.cursor = "not-allowed";
            
            clearBtn.disabled = true;
            clearBtn.style.opacity = "0.5";
            clearBtn.style.cursor = "not-allowed";
            
            // Reset UI to empty state
            statsSection.classList.add("hidden");
            tabPanels.forEach(panel => panel.classList.add("hidden"));
            emptyState.classList.remove("hidden");
            
            // Clear side details
            selectedDate = null;
            dayDetailEmpty.classList.remove("hidden");
            dayDetailContent.classList.add("hidden");
            
            document.getElementById("current-config-summary").textContent = "請設定參數並開始安排。";
        }
    }

    // Render Stats Section
    function renderStats(minCoverageThreshold) {
        let totalCourses = 0;
        let totalHours = 0;
        let warningsCount = 0;
        let coverages = [];

        Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
            const list = scheduleResult.scheduled_courses[agent];
            totalCourses += list.length;
            list.forEach(c => {
                totalHours += c.duration;
                if (c.violated) {
                    warningsCount++;
                }
                coverages.push(...c.coverage_at_hours);
            });
        });

        // Find average minimum remaining coverage
        let sumMin = 0;
        let dayCount = 0;
        Object.keys(scheduleResult.coverage_timeline).forEach(date => {
            let dayMin = 99;
            let activeHours = false;
            scheduleResult.coverage_timeline[date].forEach(h => {
                // Only count hours where anyone was online before training
                if (h.before > 0) {
                    dayMin = Math.min(dayMin, h.after);
                    activeHours = true;
                }
            });
            if (activeHours) {
                sumMin += dayMin;
                dayCount++;
            }
        });

        const avgMinCoverage = dayCount > 0 ? (sumMin / dayCount).toFixed(1) : 0;

        document.getElementById("stat-total-courses").textContent = `${totalCourses} 次`;
        document.getElementById("stat-total-hours").textContent = `${totalHours} 小時`;
        document.getElementById("stat-min-coverage").textContent = `${avgMinCoverage} 位`;
        
        const warningCard = document.getElementById("warning-stat-card");
        const warningVal = document.getElementById("stat-warnings");
        
        warningVal.textContent = `${warningsCount} 個時段`;
        if (warningsCount > 0) {
            warningCard.style.border = "1px solid var(--danger)";
            warningVal.style.color = "var(--danger)";
        } else {
            warningCard.style.border = "1px solid var(--border-color)";
            warningVal.style.color = "#fff";
        }
    }

    // Render Tab 1: Calendar View
    function renderCalendar(monthCode) {
        calendarGrid.innerHTML = "";
        
        const year = parseInt(monthCode.substring(0, 4));
        const month = parseInt(monthCode.substring(4, 6));
        
        calendarMonthTitle.textContent = `${year}年 ${month}月`;

        // First day of the month weekday
        const firstDayDate = new Date(year, month - 1, 1);
        const startDayIndex = firstDayDate.getDay(); // 0: Sun, 1: Mon, ...
        
        // Days count in month
        const daysInMonth = new Date(year, month, 0).getDate();

        // Padding empty cells before 1st of month
        for (let i = 0; i < startDayIndex; i++) {
            const cell = document.createElement("div");
            cell.className = "calendar-day empty";
            calendarGrid.appendChild(cell);
        }

        // Render days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const cell = document.createElement("div");
            cell.className = "calendar-day";
            if (selectedDate === dateStr) {
                cell.classList.add("selected");
            }

            // Day Number
            const dayNum = document.createElement("div");
            dayNum.className = "day-number";
            dayNum.textContent = d;
            cell.appendChild(dayNum);

            // Calculate courses and warnings for this day
            let dayCoursesCount = 0;
            let dayHasWarning = false;

            Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
                scheduleResult.scheduled_courses[agent].forEach(c => {
                    if (c.date === dateStr) {
                        dayCoursesCount++;
                        if (c.violated) {
                            dayHasWarning = true;
                        }
                    }
                });
            });

            // Day Badges Container
            const badgesContainer = document.createElement("div");
            badgesContainer.className = "day-badges";

            if (dayCoursesCount > 0) {
                const cBadge = document.createElement("span");
                cBadge.className = "day-badge course-badge";
                cBadge.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ${dayCoursesCount} 堂`;
                badgesContainer.appendChild(cBadge);
            }

            if (dayHasWarning) {
                const wBadge = document.createElement("span");
                wBadge.className = "day-badge warning-badge";
                wBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> 吃緊`;
                badgesContainer.appendChild(wBadge);
            }

            cell.appendChild(badgesContainer);

            // Click listener to select day
            cell.addEventListener("click", () => {
                document.querySelectorAll(".calendar-day").forEach(c => c.classList.remove("selected"));
                cell.classList.add("selected");
                selectedDate = dateStr;
                showDayDetail(dateStr);
            });

            calendarGrid.appendChild(cell);
        }
        
        // Auto-select first day containing a course
        let autoSelected = false;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            let hasCourse = false;
            Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
                if (scheduleResult.scheduled_courses[agent].some(c => c.date === dateStr)) {
                    hasCourse = true;
                }
            });
            if (hasCourse) {
                const dayCells = calendarGrid.querySelectorAll(".calendar-day:not(.empty)");
                const targetCell = dayCells[d - 1];
                targetCell.click();
                autoSelected = true;
                break;
            }
        }
        
        if (!autoSelected && daysInMonth > 0) {
            const dayCells = calendarGrid.querySelectorAll(".calendar-day:not(.empty)");
            dayCells[0].click();
        }
    }

    // Show day detail sidebar on calendar
    function showDayDetail(dateStr) {
        dayDetailEmpty.classList.add("hidden");
        dayDetailContent.classList.remove("hidden");

        const parsedDate = new Date(dateStr);
        const weekdayStr = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][parsedDate.getDay()];
        
        selectedDateTitle.textContent = dateStr;
        selectedDateWeekday.textContent = weekdayStr;

        // Gather all courses for this day
        const dayCourses = [];
        Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
            scheduleResult.scheduled_courses[agent].forEach(c => {
                if (c.date === dateStr) {
                    dayCourses.push({
                        agent: agent,
                        ...c
                    });
                }
            });
        });

        // Render Day Courses list
        dayCoursesList.innerHTML = "";
        if (dayCourses.length === 0) {
            dayCoursesList.innerHTML = `<div class="help-text" style="padding: 10px 0;"><i class="fa-solid fa-info-circle"></i> 當天無課程/會議安排。</div>`;
        } else {
            dayCourses.forEach(c => {
                const item = document.createElement("div");
                item.className = "course-item";
                if (c.violated) {
                    item.classList.add("violated-course");
                }

                const minCoverage = Math.min(...c.coverage_at_hours);

                item.innerHTML = `
                    <div class="course-item-header">
                        <span class="course-agent">${c.agent}</span>
                        <span class="course-time">${String(c.start_hour).padStart(2, "0")}:00 - ${String(c.end_hour).padStart(2, "0")}:00</span>
                    </div>
                    <div class="course-item-body">
                        <span>時長: ${c.duration}小時</span>
                        <span class="coverage-status-tag ${c.violated ? 'warn' : 'ok'}">
                            ${c.violated ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}在線: ${minCoverage}位
                        </span>
                    </div>
                `;
                dayCoursesList.appendChild(item);
            });
        }

        // Render Day Coverage Timeline Chart
        dayCoverageTimeline.innerHTML = "";
        const hourlyData = scheduleResult.coverage_timeline[dateStr] || [];
        
        hourlyData.forEach(h => {
            const barWrapper = document.createElement("div");
            barWrapper.className = "hour-bar-wrapper";

            const bar = document.createElement("div");
            bar.className = "hour-bar";
            
            // Determine agent count
            const count = h.after;
            const countBefore = h.before;
            
            // Set css class based on count
            if (countBefore === 0) {
                bar.classList.add("status-off");
                bar.style.height = "5px";
                bar.style.backgroundColor = "rgba(255,255,255,0.03)";
            } else {
                if (count === 0) {
                    bar.classList.add("c-0");
                } else if (count === 1) {
                    bar.classList.add("c-1");
                } else if (count === 2) {
                    bar.classList.add("c-2");
                } else if (count === 3) {
                    bar.classList.add("c-3");
                } else {
                    bar.classList.add("c-4");
                }
            }

            // Tooltip text
            const tooltip = document.createElement("div");
            tooltip.className = "tooltip";
            
            const inClassList = dayCourses
                .filter(c => {
                    const start = c.start_hour;
                    const end = c.end_hour;
                    if (start < end) {
                        return h.hour >= start && h.hour < end;
                    } else {
                        // overnight cross midnight (should not happen with our single-day shifts, but safely check)
                        return h.hour >= start || h.hour < end;
                    }
                })
                .map(c => c.agent);

            const inClassStr = inClassList.length > 0 ? `<br><b>上課同仁:</b> ${inClassList.join(", ")}` : "";
            const onDutyStr = h.agents_after.length > 0 ? `<br><b>值班同仁:</b> ${h.agents_after.join(", ")}` : "<br><b>無人值班 (OFF)</b>";

            tooltip.innerHTML = `
                <strong>${String(h.hour).padStart(2, "0")}:00 - ${String(h.hour + 1).padStart(2, "0")}:00</strong><br>
                排課前值班: ${h.before}位<br>
                排課後在線: ${h.after}位
                ${inClassStr}
                ${onDutyStr}
            `;
            
            const label = document.createElement("span");
            label.className = "hour-label";
            label.textContent = `${h.hour}h`;

            barWrapper.appendChild(bar);
            barWrapper.appendChild(tooltip);
            barWrapper.appendChild(label);
            
            dayCoverageTimeline.appendChild(barWrapper);
        });
    }

    // Render Tab 2: Heatmap
    function renderHeatmap() {
        heatmapCells.innerHTML = "";
        
        const dates = scheduleResult.dates;
        const timeline = scheduleResult.coverage_timeline;

        // Render Y-Axis dates
        const yAxis = document.querySelector(".heatmap-y-axis");
        // Clear previous date cells (keep header)
        yAxis.innerHTML = '<div class="axis-header-cell">日期</div>';
        
        dates.forEach(d_str => {
            const cell = document.createElement("div");
            cell.className = "axis-cell";
            cell.textContent = d_str.substring(5); // Show MM-DD
            yAxis.appendChild(cell);
        });

        // Render X-Axis hours (0..23)
        const xAxis = document.querySelector(".heatmap-x-axis");
        xAxis.innerHTML = "";
        for (let h = 0; h < 24; h++) {
            const cell = document.createElement("div");
            cell.className = "x-cell";
            cell.textContent = `${String(h).padStart(2, "0")}`;
            xAxis.appendChild(cell);
        }

        // Render cell rows
        dates.forEach(d_str => {
            const row = document.createElement("div");
            row.className = "heatmap-row";
            
            const dayData = timeline[d_str] || [];
            
            // Gather day courses for class tooltip info
            const dayCourses = [];
            Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
                scheduleResult.scheduled_courses[agent].forEach(c => {
                    if (c.date === d_str) {
                        dayCourses.push({ agent: agent, ...c });
                    }
                });
            });

            dayData.forEach(h => {
                const cell = document.createElement("div");
                cell.className = "heatmap-cell";

                const val = activeHeatmapMode === "before" ? h.before : h.after;
                const totalOnlineBefore = h.before;

                if (totalOnlineBefore === 0) {
                    // Closed/OFF
                    cell.classList.add("status-off");
                } else {
                    if (val === 0) {
                        cell.classList.add("status-0");
                    } else if (val === 1) {
                        cell.classList.add("status-1");
                    } else if (val === 2) {
                        cell.classList.add("status-2");
                    } else if (val === 3) {
                        cell.classList.add("status-3");
                    } else {
                        cell.classList.add("status-4");
                    }
                }

                // Tooltip
                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";
                
                const inClassList = dayCourses
                    .filter(c => h.hour >= c.start_hour && h.hour < c.end_hour)
                    .map(c => c.agent);

                const inClassStr = inClassList.length > 0 ? `<br><b>上課中:</b> ${inClassList.join(", ")}` : "";
                const listToShow = activeHeatmapMode === "before" ? h.agents_before : h.agents_after;
                const activeLabel = activeHeatmapMode === "before" ? "排課前值班" : "實際值勤";
                const agentsListStr = listToShow.length > 0 ? `<br><b>值班人員:</b> ${listToShow.join(", ")}` : "<br><b>無人值勤</b>";

                tooltip.innerHTML = `
                    <strong>${d_str} ${String(h.hour).padStart(2, "0")}:00 - ${String(h.hour + 1).padStart(2, "0")}:00</strong><br>
                    排課前值班: ${h.before}位<br>
                    排課後在線: ${h.after}位<br>
                    ${activeLabel}: ${val}位
                    ${inClassStr}
                    ${agentsListStr}
                `;

                cell.appendChild(tooltip);
                row.appendChild(cell);
            });
            
            heatmapCells.appendChild(row);
        });
    }

    // Render Tab 3: Detailed Table List
    function renderTable() {
        scheduleTableBody.innerHTML = "";
        
        const courses = [];
        Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
            scheduleResult.scheduled_courses[agent].forEach(c => {
                courses.push({
                    agent: agent,
                    ...c
                });
            });
        });

        // Sort by Date, then Start Hour, then Agent Name
        courses.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            if (a.start_hour !== b.start_hour) {
                return a.start_hour - b.start_hour;
            }
            return a.agent.localeCompare(b.agent);
        });

        if (courses.length === 0) {
            scheduleTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">無排課記錄</td></tr>`;
        } else {
            courses.forEach(c => {
                const tr = document.createElement("tr");
                const minCoverage = Math.min(...c.coverage_at_hours);
                
                tr.innerHTML = `
                    <td class="strong">${c.date}</td>
                    <td class="strong">${c.agent}</td>
                    <td>${String(c.start_hour).padStart(2, "0")}:00 - ${String(c.end_hour).padStart(2, "0")}:00</td>
                    <td>${c.duration} 小時</td>
                    <td>${minCoverage} 位在線 (${c.coverage_at_hours.join(" -> ")})</td>
                    <td>
                        <span class="status-indicator-inline ${c.violated ? 'danger' : 'success'}">
                            <i class="fa-solid ${c.violated ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                            ${c.violated ? '人力吃緊警告' : '在線人力安全'}
                        </span>
                    </td>
                `;
                scheduleTableBody.appendChild(tr);
            });
        }

        // Render Failed Schedules (if any)
        failedCoursesList.innerHTML = "";
        if (scheduleResult.failed_schedules && scheduleResult.failed_schedules.length > 0) {
            failedCoursesSection.classList.remove("hidden");
            scheduleResult.failed_schedules.forEach(f => {
                const li = document.createElement("li");
                li.textContent = `${f.agent} (第 ${f.course_number} 堂)`;
                failedCoursesList.appendChild(li);
            });
        } else {
            failedCoursesSection.classList.add("hidden");
        }
    }

    // Core greedy scheduling algorithm in Javascript
    function calculateScheduleJS(selectedMonth, selectedAgents, courseCount, courseDuration, minCoverage, jointClass, existingResult = null) {
        const dates = initData.dates;
        const agentsData = initData.agents;
        
        // 1. Build onlineMatrixOrig
        const onlineMatrixOrig = {};
        dates.forEach(d => {
            onlineMatrixOrig[d] = {};
            for (let h = 0; h < 24; h++) {
                onlineMatrixOrig[d][h] = [];
            }
        });
        
        SHIFTS_ALL.forEach(agentName => {
            const agentInfo = agentsData[agentName];
            if (!agentInfo) return;
            const schedule = agentInfo.schedule;
            const mealVal = agentInfo.meal;
            
            Object.keys(schedule).forEach(dStr => {
                const cellVal = schedule[dStr];
                const startHour = getAgentShiftHours(cellVal);
                if (startHour !== null) {
                    const shiftHours = [];
                    for (let i = 0; i < 9; i++) {
                        shiftHours.push((startHour + i) % 24);
                    }
                    const mealHours = parseMealHours(mealVal, startHour);
                    const workingHours = shiftHours.filter(h => !mealHours.includes(h));
                    
                    workingHours.forEach(h => {
                        if (onlineMatrixOrig[dStr] && onlineMatrixOrig[dStr][h]) {
                            onlineMatrixOrig[dStr][h].push(agentName);
                        }
                    });
                }
            });
        });
        
        // 2. Build availableAgents and scheduledCourses
        const availableAgents = {};
        let scheduledCourses = {};
        
        if (existingResult) {
            // Deep copy existing scheduled courses
            scheduledCourses = JSON.parse(JSON.stringify(existingResult.scheduled_courses));
            selectedAgents.forEach(name => {
                if (!scheduledCourses[name]) {
                    scheduledCourses[name] = [];
                }
            });
            
            // Clone sets from existing available_agents
            dates.forEach(d => {
                availableAgents[d] = {};
                for (let h = 0; h < 24; h++) {
                    availableAgents[d][h] = new Set(existingResult.available_agents[d][h]);
                }
            });
        } else {
            // Initialize fresh scheduled courses
            selectedAgents.forEach(name => {
                scheduledCourses[name] = [];
            });
            
            // Initialize fresh available agents from onlineMatrixOrig
            dates.forEach(d => {
                availableAgents[d] = {};
                for (let h = 0; h < 24; h++) {
                    availableAgents[d][h] = new Set(onlineMatrixOrig[d][h]);
                }
            });
        }
        
        const failedSchedules = [];
        
        if (jointClass) {
            // Multi-person joint meeting logic (all selected agents attend at the same time)
            for (let cNum = 1; cNum <= courseCount; cNum++) {
                let bestSlot = null;
                let bestScore = -999;
                let bestSumOnline = -999;
                
                for (let dIdx = 0; dIdx < dates.length; dIdx++) {
                    const dStr = dates[dIdx];
                    
                    // Any selected agent already has a course scheduled on this day?
                    let dayHasCourse = false;
                    for (let name of selectedAgents) {
                        if (scheduledCourses[name].some(c => c.date === dStr)) {
                            dayHasCourse = true;
                            break;
                        }
                    }
                    if (dayHasCourse) continue;
                    
                    // Check working hours and contiguous slots for all selected agents
                    const workingHoursByAgent = {};
                    let validAgentsOnDay = true;
                    for (let name of selectedAgents) {
                        const agentInfo = agentsData[name];
                        const schedule = agentInfo.schedule;
                        const mealVal = agentInfo.meal;
                        const cellVal = schedule[dStr];
                        const startHour = getAgentShiftHours(cellVal);
                        if (startHour === null) {
                            validAgentsOnDay = false;
                            break;
                        }
                        
                        const shiftHours = [];
                        for (let i = 0; i < 9; i++) {
                            shiftHours.push((startHour + i) % 24);
                        }
                        const mealHours = parseMealHours(mealVal, startHour);
                        const workingHours = shiftHours.filter(h => !mealHours.includes(h));
                        workingHoursByAgent[name] = new Set(workingHours);
                    }
                    
                    if (!validAgentsOnDay) continue;
                    
                    // Find intersection of working hours of all selected agents
                    const sets = Object.values(workingHoursByAgent);
                    const commonHoursSet = sets.reduce((acc, curr) => {
                        const intersection = new Set();
                        acc.forEach(h => {
                            if (curr.has(h)) intersection.add(h);
                        });
                        return intersection;
                    }, sets[0]);
                    
                    const commonWorkingHours = Array.from(commonHoursSet).sort((a, b) => a - b);
                    
                    // Search contiguous slots in commonWorkingHours
                    for (let idx = 0; idx <= commonWorkingHours.length - courseDuration; idx++) {
                        const candidateHours = commonWorkingHours.slice(idx, idx + courseDuration);
                        let isContiguous = true;
                        for (let k = 0; k < candidateHours.length - 1; k++) {
                            if ((candidateHours[k+1] - candidateHours[k] + 24) % 24 !== 1) {
                                isContiguous = false;
                                break;
                            }
                        }
                        if (!isContiguous) continue;
                        
                        let minRemOnline = 999;
                        let sumRemOnline = 0;
                        let validSlot = true;
                        
                        for (let h of candidateHours) {
                            for (let name of selectedAgents) {
                                if (!availableAgents[dStr][h].has(name)) {
                                    validSlot = false;
                                    break;
                                }
                            }
                            if (!validSlot) break;
                            
                            const activeAgents = Array.from(availableAgents[dStr][h]);
                            const remainingCount = activeAgents.filter(a => !selectedAgents.includes(a)).length;
                            minRemOnline = Math.min(minRemOnline, remainingCount);
                            sumRemOnline += remainingCount;
                        }
                        
                        if (!validSlot) continue;
                        
                        const score = minRemOnline;
                        
                        if (bestSlot === null || score > bestScore || (Math.abs(score - bestScore) < 0.01 && sumRemOnline > bestSumOnline)) {
                            bestSlot = { date: dStr, startHour: candidateHours[0], hours: candidateHours };
                            bestScore = score;
                            bestSumOnline = sumRemOnline;
                        }
                    }
                }
                
                if (bestSlot) {
                    const { date: dStr, startHour: hStart, hours: candidateHours } = bestSlot;
                    const minRemaining = Math.round(bestScore);
                    
                    selectedAgents.forEach(name => {
                        const cNumForAgent = scheduledCourses[name].length + 1;
                        const coverageAtHours = candidateHours.map(h => {
                            const activeAgents = Array.from(availableAgents[dStr][h]);
                            return activeAgents.filter(a => !selectedAgents.includes(a)).length;
                        });
                        const totalOnlineAtHours = candidateHours.map(h => availableAgents[dStr][h].size);
                        
                        scheduledCourses[name].push({
                            date: dStr,
                            start_hour: hStart,
                            end_hour: (hStart + courseDuration) % 24 === 0 ? 24 : (hStart + courseDuration) % 24,
                            duration: courseDuration,
                            coverage_at_hours: coverageAtHours,
                            total_online_at_hours: totalOnlineAtHours,
                            violated: minRemaining < minCoverage,
                            course_number: cNumForAgent
                        });
                        
                        candidateHours.forEach(h => {
                            availableAgents[dStr][h].delete(name);
                        });
                    });
                } else {
                    selectedAgents.forEach(name => {
                        const cNumForAgent = scheduledCourses[name].length + 1;
                        failedSchedules.push({
                            agent: name,
                            course_number: cNumForAgent
                        });
                    });
                }
            }
        } else {
            // Individual scheduling logic
            const placementRequests = [];
            for (let cIdx = 0; cIdx < courseCount; cIdx++) {
                selectedAgents.forEach(name => {
                    placementRequests.push({ agentName: name });
                });
            }
            
            placementRequests.forEach(req => {
                const name = req.agentName;
                const cNumForAgent = scheduledCourses[name].length + 1;
                const agentInfo = agentsData[name];
                const schedule = agentInfo.schedule;
                const mealVal = agentInfo.meal;
                
                let bestSlot = null;
                let bestScore = -999;
                let bestSumOnline = -999;
                
                dates.forEach(dStr => {
                    const dayHasCourse = scheduledCourses[name].some(c => c.date === dStr);
                    if (dayHasCourse) return;
                    
                    const cellVal = schedule[dStr];
                    const startHour = getAgentShiftHours(cellVal);
                    if (startHour === null) return;
                    
                    const shiftHours = [];
                    for (let i = 0; i < 9; i++) {
                        shiftHours.push((startHour + i) % 24);
                    }
                    const mealHours = parseMealHours(mealVal, startHour);
                    const workingHours = shiftHours.filter(h => !mealHours.includes(h));
                    
                    for (let idx = 0; idx <= workingHours.length - courseDuration; idx++) {
                        const candidateHours = workingHours.slice(idx, idx + courseDuration);
                        let isContiguous = true;
                        for (let k = 0; k < candidateHours.length - 1; k++) {
                            if ((candidateHours[k+1] - candidateHours[k] + 24) % 24 !== 1) {
                                isContiguous = false;
                                break;
                            }
                        }
                        if (!isContiguous) continue;
                        
                        let minOtherOnline = 999;
                        let sumOtherOnline = 0;
                        let validSlot = true;
                        
                        for (let h of candidateHours) {
                            if (!availableAgents[dStr][h].has(name)) {
                                validSlot = false;
                                break;
                            }
                            const otherOnline = availableAgents[dStr][h].size - 1;
                            minOtherOnline = Math.min(minOtherOnline, otherOnline);
                            sumOtherOnline += otherOnline;
                        }
                        
                        if (!validSlot) continue;
                        
                        let coursesOnDay = 0;
                        selectedAgents.forEach(a => {
                            scheduledCourses[a].forEach(c => {
                                if (c.date === dStr) coursesOnDay++;
                            });
                        });
                        
                        const score = minOtherOnline - (coursesOnDay * 0.05);
                        
                        if (bestSlot === null || score > bestScore || (Math.abs(score - bestScore) < 0.01 && sumOtherOnline > bestSumOnline)) {
                            bestSlot = { date: dStr, startHour: candidateHours[0], hours: candidateHours };
                            bestScore = score;
                            bestSumOnline = sumOtherOnline;
                        }
                    }
                });
                
                if (bestSlot) {
                    const { date: dStr, startHour: hStart, hours: candidateHours } = bestSlot;
                    const minRemaining = Math.round(bestScore);
                    
                    scheduledCourses[name].push({
                        date: dStr,
                        start_hour: hStart,
                        end_hour: (hStart + courseDuration) % 24 === 0 ? 24 : (hStart + courseDuration) % 24,
                        duration: courseDuration,
                        coverage_at_hours: candidateHours.map(h => availableAgents[dStr][h].size - 1),
                        total_online_at_hours: candidateHours.map(h => availableAgents[dStr][h].size),
                        violated: minRemaining < minCoverage,
                        course_number: cNumForAgent
                    });
                    
                    candidateHours.forEach(h => {
                        availableAgents[dStr][h].delete(name);
                    });
                } else {
                    failedSchedules.push({
                        agent: name,
                        course_number: cNumForAgent
                    });
                }
            });
        }
        
        // 3. Build coverageTimeline
        const coverageTimeline = {};
        dates.forEach(dStr => {
            const dayCoverage = [];
            for (let h = 0; h < 24; h++) {
                const beforeCount = onlineMatrixOrig[dStr][h].length;
                const afterCount = availableAgents[dStr][h].size;
                dayCoverage.push({
                    hour: h,
                    before: beforeCount,
                    after: afterCount,
                    agents_before: onlineMatrixOrig[dStr][h],
                    agents_after: Array.from(availableAgents[dStr][h])
                });
            }
            coverageTimeline[dStr] = dayCoverage;
        });
        
        return {
            scheduled_courses: scheduledCourses,
            failed_schedules: failedSchedules,
            coverage_timeline: coverageTimeline,
            dates: dates,
            agents: SHIFTS_ALL,
            available_agents: availableAgents
        };
    }

    // Export Scheduled Courses/Meetings to CSV
    function exportToCSV() {
        if (!scheduleResult) return;

        const courses = [];
        Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
            scheduleResult.scheduled_courses[agent].forEach(c => {
                courses.push({
                    agent: agent,
                    ...c
                });
            });
        });

        courses.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.start_hour - b.start_hour;
        });

        // CSV Header
        let csvContent = "\ufeff"; // BOM for excel utf-8 support
        csvContent += "日期,客服人員,上課時段,時長(小時),最低在線客服數,狀態\n";

        courses.forEach(c => {
            const minCoverage = Math.min(...c.coverage_at_hours);
            const statusText = c.violated ? "人力吃緊警告" : "安全在線";
            const timeStr = `${String(c.start_hour).padStart(2, "0")}:00-${String(c.end_hour).padStart(2, "0")}:00`;
            
            csvContent += `"${c.date}","${c.agent}","${timeStr}",${c.duration},${minCoverage},"${statusText}"\n`;
        });

        // Trigger Download
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const monthLabel = loadedMonthVal.textContent.replace(" ", "_");
        
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `客服課程/會議安排表_${monthLabel}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
