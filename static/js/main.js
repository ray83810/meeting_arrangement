document.addEventListener("DOMContentLoaded", () => {
    // State management
    let initData = { months: [], agents: [], dutyAgents: {} };
    let scheduleResult = null;
    let scheduleHistory = [];
    let selectedDate = null;
    let activeHeatmapMode = "after"; // "before" or "after"
    let uploadedMonthCode = null;
    let onlineMatrixOrigGlobal = {};

    // Archive / Saved Schedules variables
    const defaultSavedSchedules = [
        { name: "Molly Song", date: "2026-07-01", time: "13:00 - 15:00", duration: 2 },
        { name: "Sherry Lin", date: "2026-07-07", time: "13:00 - 15:00", duration: 2 },
        { name: "Alex Chen", date: "2026-07-07", time: "16:00 - 18:00", duration: 2 },
        { name: "Jian Kai Ding", date: "2026-07-07", time: "16:00 - 17:00", duration: 1 },
        { name: "Jian Kai Ding", date: "2026-07-13", time: "16:00 - 17:00", duration: 1 },
        { name: "Evan Liu", date: "2026-07-14", time: "15:00 - 17:00", duration: 2 },
        { name: "Amber Wang", date: "2026-07-14", time: "16:00 - 17:00", duration: 1 },
        { name: "Rex Liao", date: "2026-07-20", time: "16:00 - 17:00", duration: 1 },
        { name: "Howard Chen", date: "2026-07-21", time: "15:00 - 17:00", duration: 2 },
        { name: "Jacky Lee", date: "2026-07-21", time: "16:00 - 17:00", duration: 1 }
    ];
    let savedSchedules = defaultSavedSchedules;
    try {
        const storedSchedules = localStorage.getItem("saved_schedules");
        if (storedSchedules) {
            savedSchedules = JSON.parse(storedSchedules);
        }
    } catch (e) {
        console.error("Error parsing saved_schedules from localStorage:", e);
    }
    let archiveHistory = [];

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
    const dayDutyContainer = document.getElementById("day-duty-container");
    const dayDutyAgents = document.getElementById("day-duty-agents");
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

    // Archive / Saved Schedules DOM Elements
    const archiveTableBody = document.getElementById("archive-table-body");
    const saveCurrentBtn = document.getElementById("save-current-btn");
    const clearArchiveBtn = document.getElementById("clear-archive-btn");
    const archiveUndoBtn = document.getElementById("archive-undo-btn");
    const archiveWarningContainer = document.getElementById("archive-warning-container");
    const archiveWarningList = document.getElementById("archive-warning-list");

    // Upload Elements
    const uploadZone = document.getElementById("upload-zone");
    const fileInput = document.getElementById("file-input");
    const fileNameText = document.getElementById("file-name-text");
    const uploadStatus = document.getElementById("upload-status");

    // Modal Elements
    const altModal = document.getElementById("alternative-slots-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalAgentName = document.getElementById("modal-agent-name");
    const modalCourseName = document.getElementById("modal-course-name");
    const modalCurrentTime = document.getElementById("modal-current-time");
    const altSlotsList = document.getElementById("alternative-slots-list");

    // Training / License Planner DOM Elements
    const trainingUploadZone = document.getElementById("training-upload-zone");
    const trainingFileInput = document.getElementById("training-file-input");
    const trainingFileNameText = document.getElementById("training-file-name-text");
    const trainingFileStatus = document.getElementById("training-file-status");
    const trainingProgressBody = document.getElementById("training-progress-body");
    const trainingMonthsContainer = document.getElementById("training-months-container");
    const courseTypeSelect = document.getElementById("course-type-select");
    const durationRadios = document.getElementsByName("course-duration");

    let trainingData = null;
    try {
        const storedTraining = localStorage.getItem("training_data");
        if (storedTraining) {
            trainingData = JSON.parse(storedTraining);
        }
    } catch (e) {
        console.error("Error parsing training_data from localStorage:", e);
    }
    let reminderFileDate = localStorage.getItem("training_file_date") || null;

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

    // Training upload interactions
    if (trainingUploadZone) {
        trainingUploadZone.addEventListener("click", () => trainingFileInput.click());
    }
    
    if (trainingFileInput) {
        trainingFileInput.addEventListener("change", (e) => {
            if (trainingFileInput.files.length > 0) {
                handleTrainingFileUpload(trainingFileInput.files[0]);
            }
        });
    }

    if (trainingUploadZone) {
        ["dragenter", "dragover"].forEach(eventName => {
            trainingUploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                trainingUploadZone.classList.add("dragover");
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            trainingUploadZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                trainingUploadZone.classList.remove("dragover");
            }, false);
        });

        trainingUploadZone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleTrainingFileUpload(files[0]);
            }
        });
    }

    // Sidebar Course Item dropdown change listener
    if (courseTypeSelect) {
        courseTypeSelect.addEventListener("change", () => {
            const val = courseTypeSelect.value;
            if (val === "公司內訓" || val === "保發中心" || val === "公平待客") {
                durationRadios.forEach(r => {
                    if (r.value === "1") {
                        r.checked = true;
                        // trigger click to update tile styles
                        r.dispatchEvent(new Event('change'));
                    }
                    r.disabled = true;
                });
            } else if (val === "高齡課程" || val === "洗防課程") {
                durationRadios.forEach(r => {
                    if (r.value === "2") {
                        r.checked = true;
                        r.dispatchEvent(new Event('change'));
                    }
                    r.disabled = true;
                });
            } else {
                durationRadios.forEach(r => {
                    r.disabled = false;
                });
            }
        });
    }

    const SHIFTS_ALL = [
        "Alex Chen", "Amber Wang", "Evan Liu", "Howard Chen", 
        "Jacky Lee", "Jian Kai Ding", "Molly Song", "Rex Liao", "Sherry Lin"
    ];

    const AGENT_MAP = {
        "alex chen": "Alex Chen",
        "陳俊廷": "Alex Chen",
        "alex.chen": "Alex Chen",
        "amber wang": "Amber Wang",
        "王惠香": "Amber Wang",
        "amber.wang": "Amber Wang",
        "evan liu": "Evan Liu",
        "劉柏緯": "Evan Liu",
        "evan.liu": "Evan Liu",
        "howard chen": "Howard Chen",
        "陳哲浩": "Howard Chen",
        "howard.chen": "Howard Chen",
        "jacky lee": "Jacky Lee",
        "李宗遠": "Jacky Lee",
        "jacky.lee": "Jacky Lee",
        "jian kai ding": "Jian Kai Ding",
        "丁建凱": "Jian Kai Ding",
        "kai din": "Jian Kai Ding",
        "jiankai.ding": "Jian Kai Ding",
        "kai ding": "Jian Kai Ding",
        "molly song": "Molly Song",
        "宋芷婷": "Molly Song",
        "molly.song": "Molly Song",
        "rex liao": "Rex Liao",
        "廖哲麟": "Rex Liao",
        "rex.liao": "Rex Liao",
        "rex laio": "Rex Liao",
        "sherry lin": "Sherry Lin",
        "林舒婷": "Sherry Lin",
        "sherry.lin": "Sherry Lin",
        "will tsai": "Will Tsai",
        "蔡聆偉": "Will Tsai",
        "ray feng": "Ray Feng",
        "馮冠瑋": "Ray Feng"
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
        const match = s.match(/(\d{1,2}):(\d{2})/);
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
        const matches = [...s.matchAll(/(\d{1,2}):(\d{2})/g)];
        if (matches.length > 0) {
            return matches.map(m => parseInt(m[1], 10));
        }
        return [(startHour + 4) % 24];
    }

    function getDutyHoursForType(str) {
        if (!str) return [17, 18, 19, 20];
        const s = str.toString().trim();
        if (s.includes("晚班") || s.includes("17:00") || s.includes("17-21") || s.includes("17:00-21:00")) {
            return [17, 18, 19, 20]; // 17:00 - 21:00
        }
        if (s.includes("早班") || s.includes("日班") || s.includes("12:00-17:00") || s.includes("12-17")) {
            return [12, 13, 14, 15, 16]; // 12:00 - 17:00
        }
        if (s.includes("午班") || s.includes("12:00-21:00") || s.includes("12-21")) {
            return [12, 13, 14, 15, 16, 17, 18, 19, 20]; // 12:00 - 21:00
        }
        return [17, 18, 19, 20];
    }

    function isDutyHourOverlap(dStr, agentName, candidateHours) {
        if (!initData.dutyDetails || !initData.dutyDetails[dStr] || !initData.dutyDetails[dStr][agentName]) {
            return false;
        }
        const dutyInfo = initData.dutyDetails[dStr][agentName];
        if (!dutyInfo.hours) return false;
        return candidateHours.some(h => dutyInfo.hours.includes(h));
    }

    function getDutyInfoText(dStr, agentName) {
        if (!initData.dutyDetails || !initData.dutyDetails[dStr] || !initData.dutyDetails[dStr][agentName]) {
            return "";
        }
        const info = initData.dutyDetails[dStr][agentName];
        const t = info.type || "";
        if (t.includes("早班") || t.includes("日班") || t.includes("12:00-17:00")) return "日班值日 12:00-17:00";
        if (t.includes("午班") || t.includes("12:00-21:00")) return "午班值日 12:00-21:00";
        if (t.includes("晚班") || t.includes("17:00") || t.includes("17-21")) return "晚班值日 17:00-21:00";
        return info.type;
    }

    function getMinSchedulingDate() {
        const startDateSelect = document.getElementById("start-date-select");
        if (startDateSelect && startDateSelect.value) {
            return startDateSelect.value;
        }
        if (initData && initData.dates && initData.dates.length > 0) {
            return initData.dates[0];
        }
        return "0000-00-00";
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
                
                // Parse duty agents if they exist
                const dutyAgents = {};
                const dutyDetails = {};
                validDates.forEach(d_str => {
                    dutyAgents[d_str] = [];
                    dutyDetails[d_str] = {};
                });
                
                for (let r = 2; r <= range.e.r; r++) {
                    const cellE = sheet[XLSX.utils.encode_cell({ r: r, c: 4 })]; // Column E (0-based c:4)
                    const valE = cellE ? cellE.v : null;
                    if (valE && typeof valE === "string" && valE.includes("值日")) {
                        const valEStr = valE.toString().trim();
                        const dHours = getDutyHoursForType(valEStr);
                        validDates.forEach(d_str => {
                            const colIdx = colMapping[d_str];
                            const cell = sheet[XLSX.utils.encode_cell({ r: r, c: colIdx })];
                            const rawVal = cell ? cell.v : null;
                            if (rawVal) {
                                const normVal = normalizeName(rawVal);
                                if (normVal && SHIFTS_ALL.includes(normVal)) {
                                    if (!dutyAgents[d_str].includes(normVal)) {
                                        dutyAgents[d_str].push(normVal);
                                    }
                                    dutyDetails[d_str][normVal] = {
                                        type: valEStr,
                                        hours: dHours
                                    };
                                }
                            }
                        });
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
                
                // Calculate initial online matrix immediately on upload
                const initialOnlineMatrix = {};
                validDates.forEach(dStr => {
                    initialOnlineMatrix[dStr] = {};
                    for (let h = 0; h < 24; h++) {
                        initialOnlineMatrix[dStr][h] = [];
                    }
                });
                
                Object.keys(agentsData).forEach(agentName => {
                    const agentInfo = agentsData[agentName];
                    const schedule = agentInfo.schedule;
                    
                    validDates.forEach(dStr => {
                        const cellVal = schedule[dStr];
                        const startHour = getAgentShiftHours(cellVal);
                        if (startHour !== null) {
                            const shiftHours = [];
                            for (let i = 0; i < 9; i++) {
                                shiftHours.push((startHour + i) % 24);
                            }
                            // Subtract the default meal hour
                            const defaultMealHours = parseMealHours(agentInfo.meal, startHour);
                            const defaultMealHour = defaultMealHours[0];
                            const workingHours = shiftHours.filter(h => h !== defaultMealHour);
                            
                            workingHours.forEach(h => {
                                initialOnlineMatrix[dStr][h].push(agentName);
                            });
                        }
                    });
                });
                onlineMatrixOrigGlobal = initialOnlineMatrix;

                initData = {
                    dates: validDates,
                    agents: agentsData,
                    dutyAgents: dutyAgents,
                    dutyDetails: dutyDetails
                };

                const startDateGroup = document.getElementById("start-date-group");
                const startDateSelect = document.getElementById("start-date-select");
                if (startDateGroup && startDateSelect) {
                    startDateGroup.style.display = "block";
                    startDateSelect.innerHTML = "";
                    
                    const todayStr = new Date().toISOString().substring(0, 10);
                    let defaultIndex = 0;
                    
                    validDates.forEach((dStr, idx) => {
                        const option = document.createElement("option");
                        option.value = dStr;
                        const dParts = new Date(dStr);
                        const wDays = ["日", "一", "二", "三", "四", "五", "六"];
                        const dayOfWeek = wDays[dParts.getDay()];
                        option.textContent = `${dStr} (${dayOfWeek})`;
                        startDateSelect.appendChild(option);
                        
                        if (dStr === todayStr) {
                            defaultIndex = idx;
                        }
                    });
                    
                    startDateSelect.selectedIndex = defaultIndex;
                }
                
                const yearStr = monthCode.substring(0, 4);
                const monthStr = monthCode.substring(4);
                
                showUploadStatus("班表解析成功！", "success");
                
                loadedMonthVal.textContent = `${yearStr}年${monthStr}月`;
                loadedMonthGroup.style.display = "block";
                
                renderArchiveTable();
                
                const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
                renderStats(minCoverage);
                renderCalendar(monthCode);
                renderHeatmap();
                
                emptyState.classList.add("hidden");
                statsSection.classList.remove("hidden");
                
                const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-tab");
                tabPanels.forEach(panel => panel.classList.add("hidden"));
                document.getElementById(activeTab).classList.remove("hidden");
                
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
                showUploadStatus("解析 Excel 失敗：" + err.message + "\n\nStack Trace:\n" + err.stack, "error");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    function showUploadStatus(msg, type) {
        uploadStatus.className = "upload-status " + type;
        if (type === "error") {
            uploadStatus.style.whiteSpace = "pre-wrap";
            uploadStatus.style.fontFamily = "monospace";
            uploadStatus.style.textAlign = "left";
            uploadStatus.style.fontSize = "10px";
            uploadStatus.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            uploadStatus.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            uploadStatus.style.padding = "8px 12px";
            uploadStatus.style.borderRadius = "4px";
            uploadStatus.style.marginTop = "10px";
        } else {
            uploadStatus.style.whiteSpace = "";
            uploadStatus.style.fontFamily = "";
            uploadStatus.style.textAlign = "";
            uploadStatus.style.fontSize = "";
            uploadStatus.style.backgroundColor = "";
            uploadStatus.style.border = "";
            uploadStatus.style.padding = "";
            uploadStatus.style.borderRadius = "";
            uploadStatus.style.marginTop = "";
        }
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

            if (targetTab === "training-tab") {
                document.getElementById("training-tab").classList.remove("hidden");
                emptyState.classList.add("hidden");
                renderTrainingTab();
            } else if (targetTab === "archive-tab") {
                document.getElementById("archive-tab").classList.remove("hidden");
                emptyState.classList.add("hidden");
                renderArchiveTable();
            } else {
                if (initData && initData.dates && initData.dates.length > 0) {
                    document.getElementById(targetTab).classList.remove("hidden");
                } else {
                    emptyState.classList.remove("hidden");
                }
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

    // Close Modal Event Listeners
    closeModalBtn.addEventListener("click", () => {
        altModal.classList.add("hidden");
    });

    altModal.addEventListener("click", (e) => {
        if (e.target === altModal) {
            altModal.classList.add("hidden");
        }
    });


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

        onlineMatrixOrigGlobal = {};
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
                
                renderArchiveTable();
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
            
            renderArchiveTable();
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
            
            renderArchiveTable();
        }
    }

    // Render Stats Section
    function renderStats(minCoverageThreshold) {
        let totalCourses = 0;
        let totalHours = 0;
        let warningsCount = 0;
        let coverages = [];

        const activeCoursesMap = getActiveScheduledCourses();
        Object.keys(activeCoursesMap).forEach(agent => {
            const list = activeCoursesMap[agent];
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
        
        const dates = scheduleResult ? scheduleResult.dates : initData.dates;
        if (dates && dates.length > 0) {
            let timeline = {};
            if (scheduleResult && scheduleResult.coverage_timeline) {
                timeline = scheduleResult.coverage_timeline;
            } else {
                // Build dynamically
                dates.forEach(dStr => {
                    const dayCoverage = [];
                    const busyHours = {};
                    SHIFTS_ALL.forEach(a => {
                        busyHours[a] = new Set();
                        const agentCourses = activeCoursesMap[a] || [];
                        agentCourses.forEach(c => {
                            if (c.date === dStr) {
                                c.hours.forEach(h => busyHours[a].add(h));
                            }
                        });
                    });
                    
                    for (let h = 0; h < 24; h++) {
                        const beforeAgents = (onlineMatrixOrigGlobal[dStr] && onlineMatrixOrigGlobal[dStr][h]) ? onlineMatrixOrigGlobal[dStr][h] : [];
                        const afterAgents = beforeAgents.filter(a => !busyHours[a] || !busyHours[a].has(h));
                        
                        dayCoverage.push({
                            hour: h,
                            before: beforeAgents.length,
                            after: afterAgents.length
                        });
                    }
                    timeline[dStr] = dayCoverage;
                });
            }
            
            Object.keys(timeline).forEach(date => {
                let dayMin = 99;
                let activeHours = false;
                timeline[date].forEach(h => {
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
        }

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

    // Helper to get active courses map (active schedule or fallback to archive preset)
    function getActiveScheduledCourses() {
        if (scheduleResult && scheduleResult.scheduled_courses) {
            return scheduleResult.scheduled_courses;
        }
        
        const courses = {};
        SHIFTS_ALL.forEach(a => {
            courses[a] = [];
        });
        
        savedSchedules.forEach((item, index) => {
            const agentName = item.name;
            if (!courses[agentName]) {
                courses[agentName] = [];
            }
            
            const parsedTime = item.time.split(" - ");
            const startHour = parseInt(parsedTime[0].split(":")[0], 10);
            const endHour = parseInt(parsedTime[1].split(":")[0], 10);
            const duration = item.duration;
            
            const candidateHours = [];
            for (let i = 0; i < duration; i++) {
                candidateHours.push((startHour + i) % 24);
            }
            
            let minBefore = 0;
            let minAfter = 0;
            let mealHour = undefined;
            
            if (onlineMatrixOrigGlobal && onlineMatrixOrigGlobal[item.date]) {
                const beforeCoverages = candidateHours.map(h => onlineMatrixOrigGlobal[item.date][h] ? onlineMatrixOrigGlobal[item.date][h].length : 0);
                minBefore = Math.min(...beforeCoverages);
                minAfter = Math.max(0, minBefore - 1);
            }
            
            courses[agentName].push({
                date: item.date,
                start_hour: startHour,
                end_hour: endHour,
                duration: duration,
                hours: candidateHours,
                coverage_at_hours: candidateHours.map(() => minAfter),
                total_online_at_hours: candidateHours.map(() => minBefore),
                violated: minAfter < (parseInt(document.getElementById("coverage-select").value, 10) || 0),
                course_number: index + 1,
                meal_hour: mealHour
            });
        });
        
        return courses;
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

            const activeCoursesMap = getActiveScheduledCourses();
            Object.keys(activeCoursesMap).forEach(agent => {
                activeCoursesMap[agent].forEach(c => {
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
        const activeCoursesMap = getActiveScheduledCourses();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            let hasCourse = false;
            Object.keys(activeCoursesMap).forEach(agent => {
                if (activeCoursesMap[agent].some(c => c.date === dateStr)) {
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

        // Render Duty Agents if they exist
        if (initData.dutyAgents && initData.dutyAgents[dateStr] && initData.dutyAgents[dateStr].length > 0) {
            dayDutyContainer.classList.remove("hidden");
            dayDutyAgents.textContent = initData.dutyAgents[dateStr].join("、");
        } else {
            dayDutyContainer.classList.add("hidden");
            dayDutyAgents.textContent = "-";
        }

        // Gather all courses for this day
        const dayCourses = [];
        const activeCoursesMap = getActiveScheduledCourses();
        Object.keys(activeCoursesMap).forEach(agent => {
            activeCoursesMap[agent].forEach(c => {
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
                        <span class="course-time">${String(c.start_hour).padStart(2, "0")}:00 - ${String(c.end_hour).padStart(2, "0")}:00 <i class="fa-solid fa-pen-to-square" style="color: var(--primary); margin-left: 6px; font-size: 0.85rem;" title="按此調整時段"></i></span>
                    </div>
                    <div class="course-item-body">
                        <span>項目: ${c.course || "一般會議"} | 時長: ${c.duration}小時</span>
                        <span class="coverage-status-tag ${c.violated ? 'warn' : 'ok'}">
                            ${c.violated ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : ''}在線: ${minCoverage}位
                        </span>
                    </div>
                `;
                item.addEventListener("click", () => {
                    showAlternativeSlots(c.agent, c.course_number, c);
                });
                dayCoursesList.appendChild(item);
            });
        }

        // Render Day Coverage Timeline Chart
        dayCoverageTimeline.innerHTML = "";
        let hourlyData = [];
        if (scheduleResult && scheduleResult.coverage_timeline && scheduleResult.coverage_timeline[dateStr]) {
            hourlyData = scheduleResult.coverage_timeline[dateStr];
        } else {
            // Build dynamically from onlineMatrixOrigGlobal and savedSchedules!
            const dayCoverage = [];
            const courses = getActiveScheduledCourses();
            
            // Collect all busy hours for each agent on this date
            const busyHours = {};
            SHIFTS_ALL.forEach(a => {
                busyHours[a] = new Set();
                const agentCourses = courses[a] || [];
                agentCourses.forEach(c => {
                    if (c.date === dateStr) {
                        c.hours.forEach(h => busyHours[a].add(h));
                    }
                });
            });
            
            for (let h = 0; h < 24; h++) {
                const beforeAgents = (onlineMatrixOrigGlobal[dateStr] && onlineMatrixOrigGlobal[dateStr][h]) ? onlineMatrixOrigGlobal[dateStr][h] : [];
                const afterAgents = beforeAgents.filter(a => !busyHours[a] || !busyHours[a].has(h));
                
                dayCoverage.push({
                    hour: h,
                    before: beforeAgents.length,
                    after: afterAgents.length,
                    agents_before: beforeAgents,
                    agents_after: afterAgents
                });
            }
            hourlyData = dayCoverage;
        }
        
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
        
        const dates = scheduleResult ? scheduleResult.dates : initData.dates;
        if (!dates || dates.length === 0) return;
        
        let timeline = {};
        if (scheduleResult && scheduleResult.coverage_timeline) {
            timeline = scheduleResult.coverage_timeline;
        } else {
            // Build dynamically from onlineMatrixOrigGlobal and savedSchedules!
            const courses = getActiveScheduledCourses();
            
            dates.forEach(dStr => {
                const dayCoverage = [];
                const busyHours = {};
                SHIFTS_ALL.forEach(a => {
                    busyHours[a] = new Set();
                    const agentCourses = courses[a] || [];
                    agentCourses.forEach(c => {
                        if (c.date === dStr) {
                            c.hours.forEach(h => busyHours[a].add(h));
                        }
                    });
                });
                
                for (let h = 0; h < 24; h++) {
                    const beforeAgents = (onlineMatrixOrigGlobal[dStr] && onlineMatrixOrigGlobal[dStr][h]) ? onlineMatrixOrigGlobal[dStr][h] : [];
                    const afterAgents = beforeAgents.filter(a => !busyHours[a] || !busyHours[a].has(h));
                    
                    dayCoverage.push({
                        hour: h,
                        before: beforeAgents.length,
                        after: afterAgents.length,
                        agents_before: beforeAgents,
                        agents_after: afterAgents
                    });
                }
                timeline[dStr] = dayCoverage;
            });
        }

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
            const activeCoursesMap = getActiveScheduledCourses();
            Object.keys(activeCoursesMap).forEach(agent => {
                activeCoursesMap[agent].forEach(c => {
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
        const activeCoursesMap = getActiveScheduledCourses();
        Object.keys(activeCoursesMap).forEach(agent => {
            activeCoursesMap[agent].forEach(c => {
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
            scheduleTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">無排課記錄</td></tr>`;
        } else {
            courses.forEach(c => {
                const tr = document.createElement("tr");
                const minCoverage = Math.min(...c.coverage_at_hours);
                const mealStr = c.meal_hour !== undefined ? `${String(c.meal_hour).padStart(2, "0")}:00` : "無";
                
                tr.innerHTML = `
                    <td class="strong">${c.date}</td>
                    <td class="strong">${c.agent}</td>
                    <td><span class="badge" style="background: rgba(255, 255, 255, 0.05); color: #fff; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 500;">${c.course || "一般會議"}</span></td>
                    <td>${String(c.start_hour).padStart(2, "0")}:00 - ${String(c.end_hour).padStart(2, "0")}:00</td>
                    <td>${c.duration} 小時</td>
                    <td><span class="badge" style="background: rgba(13, 148, 136, 0.15); color: var(--primary); border: 1px solid rgba(13, 148, 136, 0.3); padding: 4px 8px; border-radius: 4px; font-weight: 600;">${mealStr}</span></td>
                    <td>${minCoverage} 位在線 (${c.coverage_at_hours.join(" -> ")})</td>
                    <td>
                        <span class="status-indicator-inline ${c.violated ? 'danger' : 'success'}">
                            <i class="fa-solid ${c.violated ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>
                            ${c.violated ? '人力吃緊警告' : '在線人力安全'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-secondary btn-sm edit-course-btn" style="padding: 4px 8px; font-size: 0.8rem; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); color: var(--primary); border-radius: 4px; font-weight: 500; cursor: pointer;"><i class="fa-solid fa-pen-to-square"></i> 調整</button>
                    </td>
                `;
                tr.addEventListener("click", () => {
                    showAlternativeSlots(c.agent, c.course_number, c);
                });
                const editBtn = tr.querySelector(".edit-course-btn");
                if (editBtn) {
                    editBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        showAlternativeSlots(c.agent, c.course_number, c);
                    });
                }
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

    // Get potential meal hour options for an agent based on their shift type and name
    function getPotentialMealHours(agentName, startHour, defaultMealHours = []) {
        if (agentName === "Molly Song") {
            return [17]; // Molly is fixed at 17:00
        }
        
        let options = [];
        if (startHour === 8 || startHour === 9) {
            options = [11, 12]; // 早班 (11:00與12:00)
        } else if (startHour === 11 || startHour === 12 || startHour === 13) {
            options = [15, 16]; // 中班 (15:00, 15:30, 16:00 - treating 15:30 as hour 15)
        } else if (startHour === 15) {
            options = [18, 19]; // 晚班 (18:00, 18:30, 19:00 - treating 18:30 as hour 18)
        } else {
            options = [...defaultMealHours];
        }
        
        // Ensure default meal hour is always one of the options
        defaultMealHours.forEach(h => {
            if (!options.includes(h)) {
                options.push(h);
            }
        });
        
        return options;
    }

    // Core greedy scheduling algorithm in Javascript
    function calculateScheduleJS(selectedMonth, selectedAgents, courseCount, courseDuration, minCoverage, jointClass, existingResult = null) {
        const courseTypeSelect = document.getElementById("course-type-select");
        const courseType = courseTypeSelect ? courseTypeSelect.value : "一般會議";
        const dates = initData.dates;
        const agentsData = initData.agents;
        
        // 1. Initialize dailyMealHours state
        const dailyMealHours = {};
        if (existingResult && existingResult.daily_meal_hours) {
            dates.forEach(d => {
                dailyMealHours[d] = { ...existingResult.daily_meal_hours[d] };
            });
        } else {
            dates.forEach(d => {
                dailyMealHours[d] = {};
                SHIFTS_ALL.forEach(a => {
                    const agentInfo = agentsData[a];
                    if (!agentInfo) return;
                    const schedule = agentInfo.schedule;
                    const cellVal = schedule[d];
                    const startHour = getAgentShiftHours(cellVal);
                    if (startHour !== null) {
                        const defaultMealHours = parseMealHours(agentInfo.meal, startHour);
                        dailyMealHours[d][a] = defaultMealHours[0]; // initialize to default meal hour
                    }
                });
            });
        }
        
        // 2. Build onlineMatrixOrig using actual assigned meal hour
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
            
            Object.keys(schedule).forEach(dStr => {
                const cellVal = schedule[dStr];
                const startHour = getAgentShiftHours(cellVal);
                if (startHour !== null) {
                    const shiftHours = [];
                    for (let i = 0; i < 9; i++) {
                        shiftHours.push((startHour + i) % 24);
                    }
                    const actualMealHour = dailyMealHours[dStr][agentName];
                    const workingHours = shiftHours.filter(h => h !== actualMealHour);
                    
                    workingHours.forEach(h => {
                        if (onlineMatrixOrig[dStr] && onlineMatrixOrig[dStr][h]) {
                            onlineMatrixOrig[dStr][h].push(agentName);
                        }
                    });
                }
            });
        });

        onlineMatrixOrigGlobal = onlineMatrixOrig;
        
        // 3. Build availableAgents and scheduledCourses
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
        const minSchedulingDate = getMinSchedulingDate();
        
        if (jointClass) {
            // Multi-person joint meeting logic (all selected agents attend at the same time)
            for (let cNum = 1; cNum <= courseCount; cNum++) {
                let bestSlot = null;
                let bestScore = -999;
                let bestSumOnline = -999;
                
                for (let dIdx = 0; dIdx < dates.length; dIdx++) {
                    const dStr = dates[dIdx];
                    if (dStr < minSchedulingDate) continue;
                    
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
                        workingHoursByAgent[name] = new Set(shiftHours);
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
                        
                        if (selectedAgents.some(a => isDutyHourOverlap(dStr, a, candidateHours))) continue;
                        
                        // Optimize meal hours for all selected agents for this candidate slot
                        const tempMeals = {};
                        selectedAgents.forEach(a => {
                            tempMeals[a] = dailyMealHours[dStr][a];
                        });
                        
                        const chosenMealHoursForSlot = {};
                        let isSlotValid = true;
                        
                        for (let name of selectedAgents) {
                            const agentInfo = agentsData[name];
                            const cellVal = agentInfo.schedule[dStr];
                            const startHour = getAgentShiftHours(cellVal);
                            const defaultMealHours = parseMealHours(agentInfo.meal, startHour);
                            const P = getPotentialMealHours(name, startHour, defaultMealHours);
                            const R = P.filter(h => !candidateHours.includes(h));
                            
                            if (R.length === 0) {
                                isSlotValid = false;
                                break;
                            }
                            
                            let bestMealHourForAgent = R[0];
                            let bestMealScoreForAgent = -999;
                            
                            R.forEach(m => {
                                tempMeals[name] = m;
                                
                                let minRem = 999;
                                let sumRem = 0;
                                
                                for (let h = 0; h < 24; h++) {
                                    const activeSet = availableAgents[dStr][h];
                                    let activeCount = activeSet.size;
                                    
                                    selectedAgents.forEach(sa => {
                                        let saWasOnline = activeSet.has(sa);
                                        let saIsOnline = false;
                                        
                                        const saInfo = agentsData[sa];
                                        const saCell = saInfo.schedule[dStr];
                                        const saStart = getAgentShiftHours(saCell);
                                        if (saStart !== null) {
                                            const saShift = [];
                                            for (let i = 0; i < 9; i++) {
                                                saShift.push((saStart + i) % 24);
                                            }
                                            const saMeal = tempMeals[sa];
                                            if (saShift.includes(h) && h !== saMeal && !candidateHours.includes(h)) {
                                                saIsOnline = true;
                                            }
                                        }
                                        
                                        if (saWasOnline && !saIsOnline) {
                                            activeCount--;
                                        } else if (!saWasOnline && saIsOnline) {
                                            activeCount++;
                                        }
                                    });
                                    
                                    let activeAgentsList = Array.from(activeSet);
                                    selectedAgents.forEach(sa => {
                                        let saWasOnline = activeSet.has(sa);
                                        let saIsOnline = false;
                                        
                                        const saInfo = agentsData[sa];
                                        const saCell = saInfo.schedule[dStr];
                                        const saStart = getAgentShiftHours(saCell);
                                        if (saStart !== null) {
                                            const saShift = [];
                                            for (let i = 0; i < 9; i++) {
                                                saShift.push((saStart + i) % 24);
                                            }
                                            const saMeal = tempMeals[sa];
                                            if (saShift.includes(h) && h !== saMeal && !candidateHours.includes(h)) {
                                                saIsOnline = true;
                                            }
                                        }
                                        
                                        if (saWasOnline && !saIsOnline) {
                                            activeAgentsList = activeAgentsList.filter(a => a !== sa);
                                        } else if (!saWasOnline && saIsOnline) {
                                            activeAgentsList.push(sa);
                                        }
                                    });
                                    
                                    const remainingCount = activeAgentsList.filter(a => !selectedAgents.includes(a)).length;
                                    minRem = Math.min(minRem, remainingCount);
                                    sumRem += remainingCount;
                                }
                                
                                const score = minRem + (sumRem * 0.001);
                                if (score > bestMealScoreForAgent) {
                                    bestMealScoreForAgent = score;
                                    bestMealHourForAgent = m;
                                }
                            });
                            
                            tempMeals[name] = bestMealHourForAgent;
                            chosenMealHoursForSlot[name] = bestMealHourForAgent;
                        }
                        
                        if (!isSlotValid) continue;
                        
                        let minRem = 999;
                        let sumRem = 0;
                        
                        candidateHours.forEach(h => {
                            const activeAgentsList = Array.from(availableAgents[dStr][h]);
                            const remainingCount = activeAgentsList.filter(a => !selectedAgents.includes(a)).length;
                            minRem = Math.min(minRem, remainingCount);
                            sumRem += remainingCount;
                        });
                        
                        const score = minRem;
                        
                        if (bestSlot === null || score > bestScore || (Math.abs(score - bestScore) < 0.01 && sumRem > bestSumOnline)) {
                            bestSlot = { date: dStr, startHour: candidateHours[0], hours: candidateHours, meals: { ...chosenMealHoursForSlot } };
                            bestScore = score;
                            bestSumOnline = sumRem;
                        }
                    }
                }
                
                if (bestSlot) {
                    const { date: dStr, startHour: hStart, hours: candidateHours, meals: chosenMealHours } = bestSlot;
                    const minRemaining = Math.round(bestScore);
                    
                    selectedAgents.forEach(name => {
                        const cNumForAgent = scheduledCourses[name].length + 1;
                        const coverageAtHours = candidateHours.map(h => {
                            const activeAgents = Array.from(availableAgents[dStr][h]);
                            return activeAgents.filter(a => !selectedAgents.includes(a)).length;
                        });
                        const totalOnlineAtHours = candidateHours.map(h => availableAgents[dStr][h].size);
                        const m_new = chosenMealHours[name];
                        
                        scheduledCourses[name].push({
                            date: dStr,
                            start_hour: hStart,
                            end_hour: (hStart + courseDuration) % 24 === 0 ? 24 : (hStart + courseDuration) % 24,
                            duration: courseDuration,
                            coverage_at_hours: coverageAtHours,
                            total_online_at_hours: totalOnlineAtHours,
                            violated: minRemaining < minCoverage,
                            course_number: cNumForAgent,
                            meal_hour: m_new,
                            course: courseType
                        });
                        
                        const m_old = dailyMealHours[dStr][name];
                        if (m_old !== null && m_old !== undefined && !candidateHours.includes(m_old)) {
                            availableAgents[dStr][m_old].add(name);
                        }
                        availableAgents[dStr][m_new].delete(name);
                        
                        candidateHours.forEach(h => {
                            availableAgents[dStr][h].delete(name);
                        });
                        
                        dailyMealHours[dStr][name] = m_new;
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
                
                let bestSlot = null;
                let bestScore = -999;
                let bestSumOnline = -999;
                
                dates.forEach(dStr => {
                    if (dStr < minSchedulingDate) return;
                    const dayHasCourse = scheduledCourses[name].some(c => c.date === dStr);
                    if (dayHasCourse) return;
                    
                    const cellVal = schedule[dStr];
                    const startHour = getAgentShiftHours(cellVal);
                    if (startHour === null) return;
                    
                    const shiftHours = [];
                    for (let i = 0; i < 9; i++) {
                        shiftHours.push((startHour + i) % 24);
                    }
                    const defaultMealHours = parseMealHours(agentInfo.meal, startHour);
                    
                    for (let idx = 0; idx <= shiftHours.length - courseDuration; idx++) {
                        const candidateHours = shiftHours.slice(idx, idx + courseDuration);
                        let isContiguous = true;
                        for (let k = 0; k < candidateHours.length - 1; k++) {
                            if ((candidateHours[k+1] - candidateHours[k] + 24) % 24 !== 1) {
                                isContiguous = false;
                                break;
                            }
                        }
                        if (!isContiguous) continue;
                        
                        if (isDutyHourOverlap(dStr, name, candidateHours)) continue;
                        
                        // Overlap check for individual classes:
                        // No two different individual classes should be scheduled at the same time slot across different agents.
                        let overlapsOtherAgentCourse = false;
                        for (let otherAgent of Object.keys(scheduledCourses)) {
                            if (otherAgent === name) continue;
                            const otherCourses = scheduledCourses[otherAgent] || [];
                            const overlaps = otherCourses.some(c => {
                                if (c.date !== dStr) return false;
                                // Check hour overlap
                                const otherHours = [];
                                for (let h = c.start_hour; h < c.start_hour + c.duration; h++) {
                                    otherHours.push(h % 24);
                                }
                                return candidateHours.some(h => otherHours.includes(h));
                            });
                            if (overlaps) {
                                overlapsOtherAgentCourse = true;
                                break;
                            }
                        }
                        if (overlapsOtherAgentCourse) continue;
                        
                        const P = getPotentialMealHours(name, startHour, defaultMealHours);
                        const R = P.filter(h => !candidateHours.includes(h));
                        
                        if (R.length === 0) continue;
                        
                        let bestMealHour = R[0];
                        let bestMealScore = -999;
                        let bestMinOtherOnline = -999;
                        let bestSumOtherOnline = -999;
                        
                        R.forEach(m => {
                            let minOtherOnline = 999;
                            let sumOtherOnline = 0;
                            
                            candidateHours.forEach(h => {
                                const otherOnline = availableAgents[dStr][h].size - (availableAgents[dStr][h].has(name) ? 1 : 0);
                                minOtherOnline = Math.min(minOtherOnline, otherOnline);
                                sumOtherOnline += otherOnline;
                            });
                            
                            let minDailyCoverage = 999;
                            let sumDailyCoverage = 0;
                            
                            for (let h = 0; h < 24; h++) {
                                const activeSet = availableAgents[dStr][h];
                                let activeCount = activeSet.size;
                                
                                let nameIsOnline = false;
                                if (shiftHours.includes(h) && h !== m && !candidateHours.includes(h)) {
                                    nameIsOnline = true;
                                }
                                let nameWasOnline = activeSet.has(name);
                                
                                if (nameWasOnline && !nameIsOnline) {
                                    activeCount--;
                                } else if (!nameWasOnline && nameIsOnline) {
                                    activeCount++;
                                }
                                
                                minDailyCoverage = Math.min(minDailyCoverage, activeCount);
                                sumDailyCoverage += activeCount;
                            }
                            
                            const mealScore = minDailyCoverage + (sumDailyCoverage * 0.001);
                            if (mealScore > bestMealScore) {
                                bestMealScore = mealScore;
                                bestMealHour = m;
                                bestMinOtherOnline = minOtherOnline;
                                bestSumOtherOnline = sumOtherOnline;
                            }
                        });
                        
                        let coursesOnDay = 0;
                        selectedAgents.forEach(a => {
                            scheduledCourses[a].forEach(c => {
                                if (c.date === dStr) coursesOnDay++;
                            });
                        });
                        
                        const score = bestMinOtherOnline - (coursesOnDay * 0.05);
                        
                        if (bestSlot === null || score > bestScore || (Math.abs(score - bestScore) < 0.01 && bestSumOtherOnline > bestSumOnline)) {
                            bestSlot = { date: dStr, startHour: candidateHours[0], hours: candidateHours, meal: bestMealHour };
                            bestScore = score;
                            bestSumOnline = bestSumOtherOnline;
                        }
                    }
                });
                
                if (bestSlot) {
                    const { date: dStr, startHour: hStart, hours: candidateHours, meal: m_new } = bestSlot;
                    const minRemaining = Math.round(bestScore);
                    
                    scheduledCourses[name].push({
                        date: dStr,
                        start_hour: hStart,
                        end_hour: (hStart + courseDuration) % 24 === 0 ? 24 : (hStart + courseDuration) % 24,
                        duration: courseDuration,
                        coverage_at_hours: candidateHours.map(h => {
                            return availableAgents[dStr][h].size - (availableAgents[dStr][h].has(name) ? 1 : 0);
                        }),
                        total_online_at_hours: candidateHours.map(h => availableAgents[dStr][h].size),
                        violated: minRemaining < minCoverage,
                        course_number: cNumForAgent,
                        meal_hour: m_new,
                        course: courseType
                    });
                    
                    const m_old = dailyMealHours[dStr][name];
                    if (m_old !== null && m_old !== undefined && !candidateHours.includes(m_old)) {
                        availableAgents[dStr][m_old].add(name);
                    }
                    availableAgents[dStr][m_new].delete(name);
                    
                    candidateHours.forEach(h => {
                        availableAgents[dStr][h].delete(name);
                    });
                    
                    dailyMealHours[dStr][name] = m_new;
                } else {
                    failedSchedules.push({
                        agent: name,
                        course_number: cNumForAgent
                    });
                }
            });
        }
        
        // 4. Build coverageTimeline
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
        
        // Convert availableAgents sets back to arrays for JSON compatibility and external use
        const availableAgentsArrays = {};
        dates.forEach(d => {
            availableAgentsArrays[d] = {};
            for (let h = 0; h < 24; h++) {
                availableAgentsArrays[d][h] = Array.from(availableAgents[d][h]);
            }
        });
        
        return {
            scheduled_courses: scheduledCourses,
            failed_schedules: failedSchedules,
            coverage_timeline: coverageTimeline,
            dates: dates,
            agents: SHIFTS_ALL,
            available_agents: availableAgentsArrays,
            daily_meal_hours: dailyMealHours
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
        csvContent += "日期,客服人員,課程項目,上課時段,時長(小時),當日用餐時間,最低在線客服數,狀態\n";

        courses.forEach(c => {
            const minCoverage = Math.min(...c.coverage_at_hours);
            const statusText = c.violated ? "人力吃緊警告" : "安全在線";
            const timeStr = `${String(c.start_hour).padStart(2, "0")}:00-${String(c.end_hour).padStart(2, "0")}:00`;
            const mealStr = c.meal_hour !== undefined ? `${String(c.meal_hour).padStart(2, "0")}:00` : "無";
            
            csvContent += `"${c.date}","${c.agent}","${c.course || "一般會議"}","${timeStr}",${c.duration},"${mealStr}",${minCoverage},"${statusText}"\n`;
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

    // Alternative Slots Helper
    function showAlternativeSlots(agentName, courseIndex, currentCourse, archiveRowIndex = null) {
        modalAgentName.textContent = agentName;
        modalCourseName.textContent = `第 ${courseIndex} 堂課 (${currentCourse.duration}小時)`;
        modalCurrentTime.textContent = `${currentCourse.date} ${String(currentCourse.start_hour).padStart(2, "0")}:00 - ${String(currentCourse.end_hour).padStart(2, "0")}:00`;
        
        altSlotsList.innerHTML = "";
        
        const agentInfo = initData.agents[agentName];
        if (!agentInfo) return;
        
        const schedule = agentInfo.schedule;
        const mealVal = agentInfo.meal;
        const duration = currentCourse.duration;
        const dates = initData.dates;
        const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
        
        const availableSlots = [];
        const minSchedulingDate = getMinSchedulingDate();
        
        dates.forEach(dStr => {
            if (dStr < minSchedulingDate) return;
            
            // Must not have another course on this day (excluding current course day)
            const dayHasOtherCourse = scheduleResult
                ? scheduleResult.scheduled_courses[agentName].some(c => c.date === dStr && (c.date !== currentCourse.date || c.start_hour !== currentCourse.start_hour))
                : false;
            if (dayHasOtherCourse) return;
            
            const isDutyAgent = initData.dutyAgents && initData.dutyAgents[dStr] && initData.dutyAgents[dStr].includes(agentName);
            
            const cellVal = schedule[dStr];
            const startHour = getAgentShiftHours(cellVal);
            if (startHour === null) return;
            
            const shiftHours = [];
            for (let i = 0; i < 9; i++) {
                shiftHours.push((startHour + i) % 24);
            }
            const defaultMealHours = parseMealHours(mealVal, startHour);
            const P = getPotentialMealHours(agentName, startHour, defaultMealHours);
            
            for (let idx = 0; idx <= shiftHours.length - duration; idx++) {
                const candidateHours = shiftHours.slice(idx, idx + duration);
                
                // Skip if it is the current slot
                if (dStr === currentCourse.date && candidateHours[0] === currentCourse.start_hour) {
                    continue;
                }
                
                let isContiguous = true;
                for (let k = 0; k < candidateHours.length - 1; k++) {
                    if ((candidateHours[k+1] - candidateHours[k] + 24) % 24 !== 1) {
                        isContiguous = false;
                        break;
                    }
                }
                if (!isContiguous) continue;
                
                // Check if candidate slot overlaps with another agent's course
                let overlapsOther = false;
                const isJointClass = scheduleResult ? scheduleResult.joint_class : false;
                if (!isJointClass) {
                    const activeCoursesMap = getActiveScheduledCourses();
                    for (let otherAgent of Object.keys(activeCoursesMap)) {
                        if (otherAgent === agentName) continue;
                        const otherCourses = activeCoursesMap[otherAgent] || [];
                        const overlaps = otherCourses.some(c => {
                            if (c.date !== dStr) return false;
                            // Do not count the course we are currently adjusting if we are in the main schedule
                            if (archiveRowIndex === null && c.date === currentCourse.date && c.start_hour === currentCourse.start_hour) {
                                return false;
                            }
                            const otherHours = [];
                            for (let h = c.start_hour; h < c.start_hour + c.duration; h++) {
                                otherHours.push(h % 24);
                            }
                            return candidateHours.some(h => otherHours.includes(h));
                        });
                        if (overlaps) {
                            overlapsOther = true;
                            break;
                        }
                    }
                }
                
                const R = P.filter(h => !candidateHours.includes(h));
                if (R.length === 0) continue;
                
                // Evaluate coverage
                const getAgentsAtHour = (d, h) => {
                    if (scheduleResult && scheduleResult.available_agents && scheduleResult.available_agents[d]) {
                        return scheduleResult.available_agents[d][h];
                    }
                    return (onlineMatrixOrigGlobal[d] && onlineMatrixOrigGlobal[d][h]) ? onlineMatrixOrigGlobal[d][h] : [];
                };
                
                const beforeCoverages = candidateHours.map(h => getAgentsAtHour(dStr, h).length);
                const minBefore = Math.min(...beforeCoverages);
                
                let bestMealHour = R[0];
                let minAfter = 0;
                let bestMealScore = -999;
                let bestMinOtherOnline = 999;
                
                R.forEach(m => {
                    let minOtherOnline = 999;
                    
                    candidateHours.forEach(h => {
                        const currentAgents = getAgentsAtHour(dStr, h);
                        const hasAgent = currentAgents.includes(agentName);
                        const otherOnline = currentAgents.length - (hasAgent ? 1 : 0);
                        minOtherOnline = Math.min(minOtherOnline, otherOnline);
                    });
                    
                    let minDailyCoverage = 999;
                    for (let h = 0; h < 24; h++) {
                        const currentAgents = getAgentsAtHour(dStr, h);
                        let activeCount = currentAgents.length;
                        
                        let nameWasOnline = currentAgents.includes(agentName);
                        let nameIsOnline = false;
                        if (shiftHours.includes(h) && h !== m && !candidateHours.includes(h)) {
                            nameIsOnline = true;
                        }
                        
                        if (nameWasOnline && !nameIsOnline) {
                            activeCount--;
                        } else if (!nameWasOnline && nameIsOnline) {
                            activeCount++;
                        }
                        
                        minDailyCoverage = Math.min(minDailyCoverage, activeCount);
                    }
                    
                    const score = minDailyCoverage;
                    if (score > bestMealScore) {
                        bestMealScore = score;
                        bestMealHour = m;
                        bestMinOtherOnline = minOtherOnline;
                    }
                });
                
                minAfter = bestMinOtherOnline;
                
                const overlapsDutyHours = isDutyHourOverlap(dStr, agentName, candidateHours);
                
                availableSlots.push({
                    date: dStr,
                    startHour: candidateHours[0],
                    endHour: (candidateHours[0] + duration) % 24 === 0 ? 24 : (candidateHours[0] + duration) % 24,
                    hours: candidateHours,
                    minBefore: minBefore,
                    minAfter: minAfter,
                    mealHour: bestMealHour,
                    violated: minAfter < minCoverage,
                    isMealOverlap: candidateHours.includes(defaultMealHours[0]),
                    isDutyAgent: isDutyAgent,
                    overlapsDutyHours: overlapsDutyHours,
                    overlapsOther: overlapsOther
                });
            }
        });
        
        availableSlots.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startHour - b.startHour;
        });
        
        if (availableSlots.length === 0) {
            altSlotsList.innerHTML = `
                <div class="no-slots-help">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 2.2rem; color: var(--text-muted); margin-bottom: 8px;"></i>
                    <span>此同仁在其他工作天均無可行且不衝突的排課時段。</span>
                </div>
            `;
        } else {
            availableSlots.forEach(slot => {
                const row = document.createElement("div");
                row.className = "slot-row-item";
                
                const timeStr = `${String(slot.startHour).padStart(2, "0")}:00 - ${String(slot.endHour).padStart(2, "0")}:00`;
                const dateParts = new Date(slot.date);
                const wDays = ["日", "一", "二", "三", "四", "五", "六"];
                const dayOfWeek = wDays[dateParts.getDay()];
                
                const beforeText = `${slot.minBefore} 位`;
                const afterText = `${slot.minAfter} 位`;
                const afterClass = slot.violated ? 'warn' : 'ok';
                
                const mealOverlapBadge = slot.isMealOverlap 
                    ? `<span class="meal-overlap-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.75rem; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px;" title="此排課時段與同仁預設用餐時間衝突，需要客服人員主動協調"><i class="fa-solid fa-utensils"></i> 與預設用餐重疊 (需要客服人員主動協調)</span>`
                    : '';

                let dutyBadge = '';
                if (slot.overlapsDutyHours) {
                    const dutyText = getDutyInfoText(slot.date, agentName);
                    dutyBadge = `<span class="duty-overlap-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px;" title="警示：與值日時段重疊 (${dutyText})"><i class="fa-solid fa-triangle-exclamation"></i> 警示：與值日時段重疊 (${dutyText})</span>`;
                } else if (slot.isDutyAgent) {
                    const dutyText = getDutyInfoText(slot.date, agentName);
                    dutyBadge = `<span class="duty-info-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.75rem; background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px;" title="當日為值日同仁 (${dutyText})，此時段非值日時段"><i class="fa-solid fa-user-shield"></i> 當日值日 (${dutyText})</span>`;
                }

                const courseOverlapBadge = slot.overlapsOther
                    ? `<span class="course-overlap-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px;" title="與其他同仁之課程時間重疊"><i class="fa-solid fa-triangle-exclamation"></i> 與其他課程時間重疊</span>`
                    : '';

                row.innerHTML = `
                    <div class="slot-time-col">
                        <span class="slot-date">${slot.date} (${dayOfWeek})</span>
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
                            <span class="slot-hour"><i class="fa-solid fa-clock"></i> ${timeStr} | 用餐: ${slot.mealHour}:00</span>
                            ${dutyBadge}
                            ${courseOverlapBadge}
                            ${mealOverlapBadge}
                        </div>
                    </div>
                    <div class="slot-coverage-col">
                        <div class="cov-metric before">
                            <span>排課前在線</span>
                            <strong>${beforeText}</strong>
                        </div>
                        <div class="cov-metric after">
                            <span>排課後在線</span>
                            <strong class="${afterClass}">${afterText}</strong>
                        </div>
                    </div>
                    <div class="slot-action-col">
                        <button class="move-slot-btn">移至此時段</button>
                    </div>
                `;
                
                const moveBtn = row.querySelector(".move-slot-btn");
                moveBtn.addEventListener("click", () => {
                    if (archiveRowIndex !== null && archiveRowIndex !== undefined) {
                        pushArchiveHistory();
                        savedSchedules[archiveRowIndex].date = slot.date;
                        savedSchedules[archiveRowIndex].time = `${String(slot.startHour).padStart(2, "0")}:00 - ${String((slot.startHour + currentCourse.duration) % 24).padStart(2, "0")}:00`;
                        savedSchedules[archiveRowIndex].duration = currentCourse.duration;
                        renderArchiveTable();
                        if (uploadedMonthCode) {
                            renderCalendar(uploadedMonthCode);
                            renderHeatmap();
                            const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
                            renderStats(minCoverage);
                        }
                        autoSaveArchive();
                        altModal.classList.add("hidden");
                        showUploadStatus(`已更新暫存排程：將 ${agentName} 的時段變更為 ${slot.date} ${savedSchedules[archiveRowIndex].time}，並已自動儲存至瀏覽器！`, "success");
                    } else {
                        moveCourseToSlot(agentName, currentCourse, slot);
                    }
                });
                
                altSlotsList.appendChild(row);
            });
        }

        // Handle Custom Target Date Selection
        const customDateInput = document.getElementById("custom-target-date-input");
        const applyCustomDateBtn = document.getElementById("apply-custom-date-btn");
        if (customDateInput) {
            customDateInput.value = currentCourse.date || "";
        }
        if (applyCustomDateBtn) {
            const newBtn = applyCustomDateBtn.cloneNode(true);
            applyCustomDateBtn.parentNode.replaceChild(newBtn, applyCustomDateBtn);
            newBtn.addEventListener("click", () => {
                const targetDate = document.getElementById("custom-target-date-input").value;
                if (!targetDate) {
                    alert("請選擇或輸入有效的日期！");
                    return;
                }

                if (archiveRowIndex !== null && archiveRowIndex !== undefined) {
                    pushArchiveHistory();
                    savedSchedules[archiveRowIndex].date = targetDate;
                    renderArchiveTable();
                    if (uploadedMonthCode) {
                        renderCalendar(uploadedMonthCode);
                        renderHeatmap();
                        const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
                        renderStats(minCoverage);
                    }
                    renderTrainingTab();
                    autoSaveArchive();
                    altModal.classList.add("hidden");
                    showUploadStatus(`已成功將 ${agentName} 的課程安排調整至新日期：${targetDate}！`, "success");
                } else {
                    const customSlot = {
                        date: targetDate,
                        startHour: currentCourse.start_hour || 9,
                        duration: currentCourse.duration || 2,
                        mealHour: currentCourse.start_hour ? (currentCourse.start_hour + currentCourse.duration) : 12
                    };
                    moveCourseToSlot(agentName, currentCourse, customSlot);
                    renderTrainingTab();
                    altModal.classList.add("hidden");
                }
            });
        }
        
        altModal.classList.remove("hidden");
    }

    // Move Course Slot Action
    function moveCourseToSlot(agentName, oldCourse, newSlot) {
        if (scheduleHistory.length >= 15) {
            scheduleHistory.shift();
        }
        scheduleHistory.push(JSON.stringify(scheduleResult));
        
        undoBtn.disabled = false;
        undoBtn.style.opacity = "1";
        undoBtn.style.cursor = "pointer";
        
        const d_old = oldCourse.date;
        const d_new = newSlot.date;
        const duration = oldCourse.duration;
        const agentInfo = initData.agents[agentName];
        const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
        
        // 1. Remove course from d_old
        const cList = scheduleResult.scheduled_courses[agentName];
        const idx = cList.findIndex(c => c.date === d_old && c.start_hour === oldCourse.start_hour);
        if (idx !== -1) {
            cList.splice(idx, 1);
        }
        
        // Restore agent to d_old original working hours
        const oldStartHour = getAgentShiftHours(agentInfo.schedule[d_old]);
        const oldDefaultMealHours = parseMealHours(agentInfo.meal, oldStartHour);
        const oldDefaultMeal = oldDefaultMealHours[0];
        
        for (let h = 0; h < 24; h++) {
            const isOnlineNow = onlineMatrixOrigGlobal[d_old] && onlineMatrixOrigGlobal[d_old][h].includes(agentName);
            const activeSet = new Set(scheduleResult.available_agents[d_old][h]);
            if (isOnlineNow) {
                activeSet.add(agentName);
            } else {
                activeSet.delete(agentName);
            }
            scheduleResult.available_agents[d_old][h] = Array.from(activeSet);
        }
        scheduleResult.daily_meal_hours[d_old][agentName] = oldDefaultMeal;
        
        // 2. Add course to d_new
        const newStartHour = getAgentShiftHours(agentInfo.schedule[d_new]);
        const newShiftHours = [];
        for (let i = 0; i < 9; i++) {
            newShiftHours.push((newStartHour + i) % 24);
        }
        
        const newCourse = {
            date: d_new,
            start_hour: newSlot.startHour,
            end_hour: newSlot.endHour,
            duration: duration,
            coverage_at_hours: newSlot.hours.map(h => {
                const activeSet = new Set(scheduleResult.available_agents[d_new][h]);
                return activeSet.size - (activeSet.has(agentName) ? 1 : 0);
            }),
            total_online_at_hours: newSlot.hours.map(h => {
                const activeSet = new Set(scheduleResult.available_agents[d_new][h]);
                activeSet.delete(agentName);
                return activeSet.size;
            }),
            violated: newSlot.violated,
            course_number: oldCourse.course_number,
            meal_hour: newSlot.mealHour,
            course: oldCourse.course || "一般會議"
        };
        cList.push(newCourse);
        cList.sort((a, b) => a.course_number - b.course_number);
        
        // Update available_agents for d_new
        for (let h = 0; h < 24; h++) {
            const isOnlineNow = newShiftHours.includes(h) && h !== newSlot.mealHour && !newSlot.hours.includes(h);
            const activeSet = new Set(scheduleResult.available_agents[d_new][h]);
            if (isOnlineNow) {
                activeSet.add(agentName);
            } else {
                activeSet.delete(agentName);
            }
            scheduleResult.available_agents[d_new][h] = Array.from(activeSet);
        }
        scheduleResult.daily_meal_hours[d_new][agentName] = newSlot.mealHour;
        
        // 3. Recalculate coverageTimeline
        const datesToRecalc = [d_old, d_new];
        datesToRecalc.forEach(dStr => {
            const dayCoverage = [];
            for (let h = 0; h < 24; h++) {
                const beforeCount = onlineMatrixOrigGlobal[dStr] ? onlineMatrixOrigGlobal[dStr][h].length : 0;
                const afterCount = scheduleResult.available_agents[dStr][h].length;
                dayCoverage.push({
                    hour: h,
                    before: beforeCount,
                    after: afterCount,
                    agents_before: onlineMatrixOrigGlobal[dStr] ? onlineMatrixOrigGlobal[dStr][h] : [],
                    agents_after: scheduleResult.available_agents[dStr][h]
                });
            }
            scheduleResult.coverage_timeline[dStr] = dayCoverage;
        });
        
        // 4. Update UI
        renderStats(minCoverage);
        renderCalendar(uploadedMonthCode);
        renderHeatmap();
        renderTable();
        
        renderArchiveTable();
        
        // Show success toast
        showUploadStatus(`已成功將 ${agentName} 的課程移動至 ${d_new} (${String(newSlot.startHour).padStart(2, "0")}:00 - ${String(newSlot.endHour).padStart(2, "0")}:00)！`, "success");
        
        // Close modal
        altModal.classList.add("hidden");
    }

    // Archive / Saved Schedules Logic
    // Archive / Saved Schedules Logic
    function renderArchiveTable() {
        archiveTableBody.innerHTML = "";
        if (savedSchedules.length === 0) {
            archiveTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">無排程存檔紀錄</td></tr>`;
            archiveWarningContainer.classList.add("hidden");
            archiveWarningList.innerHTML = "";
            return;
        }

        // 1. Precompute overlaps
        const overlaps = [];
        const rowOverlaps = {};
        savedSchedules.forEach((_, idx) => {
            rowOverlaps[idx] = [];
        });

        for (let i = 0; i < savedSchedules.length; i++) {
            const item1 = savedSchedules[i];
            const parsedTime1 = item1.time.split(" - ");
            const start1 = parseInt(parsedTime1[0].split(":")[0], 10);
            const end1 = parseInt(parsedTime1[1].split(":")[0], 10);
            
            const hours1 = [];
            for (let h = start1; h < end1; h++) {
                hours1.push(h % 24);
            }
            
            for (let j = i + 1; j < savedSchedules.length; j++) {
                const item2 = savedSchedules[j];
                if (item1.date !== item2.date) continue;
                
                const parsedTime2 = item2.time.split(" - ");
                const start2 = parseInt(parsedTime2[0].split(":")[0], 10);
                const end2 = parseInt(parsedTime2[1].split(":")[0], 10);
                
                const hours2 = [];
                for (let h = start2; h < end2; h++) {
                    hours2.push(h % 24);
                }
                
                // If they overlap
                const overlapsHours = hours1.some(h => hours2.includes(h));
                if (overlapsHours) {
                    overlaps.push({
                        date: item1.date,
                        agent1: item1.name,
                        time1: item1.time,
                        agent2: item2.name,
                        time2: item2.time
                    });
                    rowOverlaps[i].push(item2.name);
                    rowOverlaps[j].push(item1.name);
                }
            }
        }
        
        savedSchedules.forEach((item, index) => {
            // Validate the row against initData and scheduleResult
            const statusBadges = [];
            let violated = false;
            
            if (!initData.dates || initData.dates.length === 0) {
                statusBadges.push(`<span class="status-indicator-inline" style="background: rgba(255,255,255,0.05); color: var(--text-muted); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem;"><i class="fa-solid fa-file-excel" style="margin-right: 4px;"></i>請先上傳班表</span>`);
            } else {
                const agentInfo = initData.agents[item.name];
                if (!agentInfo) {
                    statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;"><i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i>找不到同仁資料</span>`);
                    violated = true;
                } else {
                    const date = item.date;
                    const cellVal = agentInfo.schedule[date];
                    const startHour = getAgentShiftHours(cellVal);
                    
                    if (startHour === null) {
                        statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;" title="當天是 OFF / 請假 / 未上班"><i class="fa-solid fa-calendar-xmark" style="margin-right: 4px;"></i>當天非上班日</span>`);
                        violated = true;
                    } else {
                        // Parse time range
                        const parsedTime = item.time.split(" - ");
                        const hStart = parseInt(parsedTime[0].split(":")[0], 10);
                        const duration = item.duration;
                        
                        const shiftHours = [];
                        for (let i = 0; i < 9; i++) {
                            shiftHours.push((startHour + i) % 24);
                        }
                        
                        // Check if course hours are fully inside shiftHours
                        let inShift = true;
                        const courseHours = [];
                        for (let i = 0; i < duration; i++) {
                            const h = (hStart + i) % 24;
                            courseHours.push(h);
                            if (!shiftHours.includes(h)) {
                                inShift = false;
                            }
                        }
                        
                        if (!inShift) {
                            statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;" title="排課時段超出該班別上班時間"><i class="fa-solid fa-clock" style="margin-right: 4px;"></i>超出上班時段</span>`);
                            violated = true;
                        } else {
                            // Check meal hours
                            let mealOverlap = false;
                            let mealHours = [];
                            if (scheduleResult && scheduleResult.daily_meal_hours && scheduleResult.daily_meal_hours[date] && scheduleResult.daily_meal_hours[date][item.name] !== undefined) {
                                mealHours = [scheduleResult.daily_meal_hours[date][item.name]];
                            } else {
                                mealHours = parseMealHours(agentInfo.meal, startHour);
                            }
                            
                            courseHours.forEach(h => {
                                if (mealHours.includes(h)) {
                                    mealOverlap = true;
                                }
                            });
                            
                            if (mealOverlap) {
                                statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;" title="排課時段與同仁用餐時間重疊"><i class="fa-solid fa-utensils" style="margin-right: 4px;"></i>與用餐時段重疊</span>`);
                                violated = true;
                            } else {
                                // Check duty agent
                                const isDuty = initData.dutyAgents && initData.dutyAgents[date] && initData.dutyAgents[date].includes(item.name);
                                if (isDuty) {
                                    statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;" title="同仁當日擔任值日生，不應安排課程/會議"><i class="fa-solid fa-user-shield" style="margin-right: 4px;"></i>當日擔任值日生</span>`);
                                    violated = true;
                                } else {
                                    // Check coverage threshold
                                    let coverageLow = false;
                                    let minCovVal = null;
                                    if (scheduleResult && scheduleResult.coverage_timeline && scheduleResult.coverage_timeline[date]) {
                                        const timeline = scheduleResult.coverage_timeline[date];
                                        const minCoverageThreshold = parseInt(document.getElementById("coverage-select").value, 10) || 0;
                                        
                                        const hourCoverages = courseHours.map(h => {
                                            const entry = timeline.find(t => t.hour === h);
                                            return entry ? entry.after : 0;
                                        });
                                        minCovVal = Math.min(...hourCoverages);
                                        if (minCovVal < minCoverageThreshold) {
                                            coverageLow = true;
                                        }
                                    }
                                    
                                    if (coverageLow) {
                                        statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(239,68,68,0.15); color: #f87171; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.8rem;" title="時段內的在線人力 (${minCovVal}位) 低於安全門檻"><i class="fa-solid fa-users-slash" style="margin-right: 4px;"></i>在線人力不足 (${minCovVal}位)</span>`);
                                        violated = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Overlap warning badge
            if (rowOverlaps[index] && rowOverlaps[index].length > 0) {
                const uniqueNames = Array.from(new Set(rowOverlaps[index]));
                statusBadges.push(`<span class="status-indicator-inline danger" style="background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;" title="與 ${uniqueNames.join(', ')} 同時段上課"><i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i>與 ${uniqueNames.join(', ')} 重疊</span>`);
                violated = true;
            }
            
            if (statusBadges.length === 0) {
                statusBadges.push(`<span class="status-indicator-inline success" style="background: rgba(16,185,129,0.15); color: #34d399; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3); font-size: 0.8rem;"><i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i>符合安全規範</span>`);
            }
            
            const statusHTML = statusBadges.join(" ");

            const courseSelectHTML = `
                <div class="select-wrapper" style="min-width: 120px;">
                    <select class="archive-course-select" data-index="${index}" style="padding: 4px 8px; font-size: 0.8rem; height: auto; background: #1e293b; border: 1px solid var(--border-color); border-radius: 4px; color: #fff; width: 100%; cursor: pointer;">
                        <option value="公司內訓" ${item.course === "公司內訓" ? "selected" : ""}>公司內訓</option>
                        <option value="保發中心" ${item.course === "保發中心" ? "selected" : ""}>保發中心</option>
                        <option value="高齡課程" ${item.course === "高齡課程" ? "selected" : ""}>高齡課程</option>
                        <option value="洗防課程" ${item.course === "洗防課程" ? "selected" : ""}>洗防課程</option>
                        <option value="公平待客" ${item.course === "公平待客" ? "selected" : ""}>公平待客</option>
                        <option value="一般會議" ${(!item.course || item.course === "一般會議" || (item.course !== "公司內訓" && item.course !== "保發中心" && item.course !== "高齡課程" && item.course !== "洗防課程" && item.course !== "公平待客")) ? "selected" : ""}>一般會議</option>
                    </select>
                </div>
            `;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="strong">${item.name}</td>
                <td>${item.date}</td>
                <td>${courseSelectHTML}</td>
                <td>${item.time}</td>
                <td>${item.duration} 小時</td>
                <td>${statusHTML}</td>
                <td>
                    <button class="edit-archive-btn" style="padding: 4px 8px; font-size: 0.8rem; background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.3); color: var(--primary); border-radius: 4px; font-weight: 500; cursor: pointer; margin-right: 6px;"><i class="fa-solid fa-pen-to-square"></i> 調整</button>
                    <button class="delete-archive-btn" style="padding: 4px 8px; font-size: 0.8rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; border-radius: 4px; font-weight: 500; cursor: pointer;"><i class="fa-solid fa-trash-can"></i> 刪除</button>
                </td>
            `;

            const courseSelectEl = tr.querySelector(".archive-course-select");
            if (courseSelectEl) {
                courseSelectEl.addEventListener("change", (e) => {
                    const newCourse = e.target.value;
                    pushArchiveHistory();
                    
                    item.course = newCourse;
                    
                    if (newCourse === "公司內訓" || newCourse === "保發中心" || newCourse === "公平待客") {
                        item.duration = 1;
                    } else if (newCourse === "高齡課程" || newCourse === "洗防課程") {
                        item.duration = 2;
                    }
                    
                    const parsedTime = item.time.split(" - ");
                    const startHour = parseInt(parsedTime[0].split(":")[0], 10);
                    const endHour = (startHour + item.duration) % 24;
                    item.time = `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
                    
                    autoSaveArchive();
                    renderArchiveTable();
                    if (uploadedMonthCode) {
                        renderCalendar(uploadedMonthCode);
                        renderHeatmap();
                        const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
                        renderStats(minCoverage);
                    }
                    if (trainingData) {
                        renderTrainingTab();
                    }
                });
            }
            
            const editBtn = tr.querySelector(".edit-archive-btn");
            editBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const parsedTime = item.time.split(" - ");
                const startHour = parseInt(parsedTime[0].split(":")[0], 10);
                const endHour = parseInt(parsedTime[1].split(":")[0], 10);
                const tempCourse = {
                    agent: item.name,
                    date: item.date,
                    start_hour: startHour,
                    end_hour: endHour,
                    duration: item.duration,
                    course_number: index + 1
                };
                showAlternativeSlots(item.name, index + 1, tempCourse, index);
            });

            const delBtn = tr.querySelector(".delete-archive-btn");
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                pushArchiveHistory();
                savedSchedules.splice(index, 1);
                renderArchiveTable();
                autoSaveArchive();
            });
            
            archiveTableBody.appendChild(tr);
        });
        
        // Render warning notifications at the bottom of the table
        if (overlaps.length > 0) {
            archiveWarningContainer.classList.remove("hidden");
            archiveWarningList.innerHTML = "";
            overlaps.forEach(o => {
                const li = document.createElement("li");
                li.innerHTML = `<strong>${o.date}</strong> 重疊：<b>${o.agent1}</b> (${o.time1}) 與 <b>${o.agent2}</b> (${o.time2}) 同時段上課。`;
                archiveWarningList.appendChild(li);
            });
        } else {
            archiveWarningContainer.classList.add("hidden");
            archiveWarningList.innerHTML = "";
        }
        
        if (!scheduleResult && uploadedMonthCode) {
            renderCalendar(uploadedMonthCode);
            renderHeatmap();
            const minCoverage = parseInt(document.getElementById("coverage-select").value, 10) || 0;
            renderStats(minCoverage);
        }
        
        if (trainingData) {
            renderTrainingTab();
        }
    }

    // Archive History and Unsaved status helpers
    function pushArchiveHistory() {
        if (archiveHistory.length >= 20) {
            archiveHistory.shift();
        }
        archiveHistory.push(JSON.stringify(savedSchedules));
        updateArchiveUndoBtnState();
    }

    function updateArchiveUndoBtnState() {
        if (archiveHistory.length > 0) {
            archiveUndoBtn.disabled = false;
            archiveUndoBtn.style.opacity = "1";
            archiveUndoBtn.style.cursor = "pointer";
        } else {
            archiveUndoBtn.disabled = true;
            archiveUndoBtn.style.opacity = "0.5";
            archiveUndoBtn.style.cursor = "not-allowed";
        }
    }

    function autoSaveArchive() {
        localStorage.setItem("saved_schedules", JSON.stringify(savedSchedules));
    }

    archiveUndoBtn.addEventListener("click", () => {
        if (archiveHistory.length > 0) {
            const prevStateStr = archiveHistory.pop();
            savedSchedules = JSON.parse(prevStateStr);
            renderArchiveTable();
            updateArchiveUndoBtnState();
            autoSaveArchive();
            showUploadStatus("已還原上一次的存檔操作，並自動儲存至瀏覽器。", "success");
        }
    });

    saveCurrentBtn.addEventListener("click", () => {
        if (!scheduleResult) {
            alert("目前沒有排課結果可以儲存！");
            return;
        }
        
        const courses = [];
        Object.keys(scheduleResult.scheduled_courses).forEach(agent => {
            scheduleResult.scheduled_courses[agent].forEach(c => {
                courses.push({
                    name: agent,
                    date: c.date,
                    time: `${String(c.start_hour).padStart(2, "0")}:00 - ${String(c.end_hour).padStart(2, "0")}:00`,
                    duration: c.duration,
                    course: c.course || "一般會議"
                });
            });
        });
        
        if (courses.length === 0) {
            alert("目前排課結果中無已排定課程！");
            return;
        }
        
        pushArchiveHistory();
        let addedCount = 0;
        courses.forEach(c => {
            const exists = savedSchedules.some(s => s.name === c.name && s.date === c.date && s.time === c.time);
            if (!exists) {
                savedSchedules.push(c);
                addedCount++;
            }
        });
        
        renderArchiveTable();
        autoSaveArchive();
        showUploadStatus(`已成功將當前排課結果（共新增了 ${addedCount} 筆排程）儲存至瀏覽器存檔中！`, "success");
    });

    const saveListToArchiveBtn = document.getElementById("save-list-to-archive-btn");
    if (saveListToArchiveBtn) {
        saveListToArchiveBtn.addEventListener("click", () => {
            saveCurrentBtn.click();
        });
    }

    clearArchiveBtn.addEventListener("click", () => {
        if (confirm("您確定要清空所有的排程存檔嗎？此動作無法復原。")) {
            pushArchiveHistory();
            savedSchedules = [];
            renderArchiveTable();
            autoSaveArchive();
            showUploadStatus("已清空存檔，並將變減儲存至瀏覽器。", "success");
        }
    });

    function formatExcelDate(val) {
        if (!val) return "";
        if (typeof val === "number") {
            const date = new Date(1899, 11, 30);
            date.setDate(date.getDate() + Math.floor(val));
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }
        return val.toString().trim().split(" ")[0];
    }

    // Training Planner File Upload Handler
    function handleTrainingFileUpload(file) {
        if (!file.name.endsWith(".xlsx")) {
            alert("僅支援 .xlsx 格式的 Excel 檔案！");
            return;
        }
        
        let fileDate = null;
        const match = file.name.match(/(\d{4})(\d{2})(\d{2})/);
        if (match) {
            fileDate = `${match[1]}-${match[2]}-${match[3]}`;
        } else {
            const today = new Date();
            fileDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                
                const sheet1Name = workbook.SheetNames.find(n => n.includes("內訓") && n.includes("保發"));
                const sheet2Name = workbook.SheetNames.find(n => n.includes("高齡") && n.includes("洗防"));
                
                if (!sheet1Name || !sheet2Name) {
                    alert("Excel 檔案工作表名稱不符合預期（必須包含『內訓+保發』與『高齡+洗防』相關工作表）！");
                    return;
                }
                
                const sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1Name]);
                const sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet2Name]);
                
                const parsedAgents = {};
                
                sheet1.forEach(row => {
                    const rawName = row["姓名"];
                    if (!rawName) return;
                    const name = normalizeName(rawName);
                    if (!name) return;
                    
                    const internalRemaining = parseInt(row["公司內訓-剩餘堂數"], 10) || 0;
                    const insuranceRemaining = parseInt(row["保發中心-剩餘堂數"], 10) || 0;
                    const expiry = formatExcelDate(row["訓練到期日"]);
                    
                    parsedAgents[name] = {
                        name: name,
                        expiry: expiry,
                        internalRemaining: internalRemaining,
                        insuranceRemaining: insuranceRemaining,
                        seniorCompleted: true,
                        amlCompleted: true,
                        fairCompleted: true
                    };
                });
                
                sheet2.forEach(row => {
                    const rawName = row["姓名"];
                    if (!rawName) return;
                    const name = normalizeName(rawName);
                    if (!name) return;
                    
                    const seniorStatus = row["高齡-完成情況"] || row["高齡-完成狀態"] || "";
                    const amlStatus = row["洗防課程-完成狀態"] || "";
                    const fairStatus = row["公平待客-完成狀態"] || "";
                    
                    if (parsedAgents[name]) {
                        parsedAgents[name].seniorCompleted = (seniorStatus.trim() === "已完成");
                        parsedAgents[name].amlCompleted = (amlStatus.trim() === "已完成");
                        parsedAgents[name].fairCompleted = (fairStatus.trim() === "已完成");
                    }
                });
                
                const trainingList = Object.values(parsedAgents);
                if (trainingList.length === 0) {
                    alert("Excel 檔案中找不到符合的客服同仁資料！");
                    return;
                }
                
                trainingData = trainingList;
                reminderFileDate = fileDate;
                
                localStorage.setItem("training_data", JSON.stringify(trainingData));
                localStorage.setItem("training_file_date", reminderFileDate);
                
                renderTrainingTab();
                alert("上課提醒 Excel 載入成功！");
                
            } catch (err) {
                console.error("Error parsing training excel:", err);
                alert("解析上課提醒 Excel 失敗：" + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Render Training Audit & Planning Tab
    function renderTrainingTab() {
        try {
            if (!trainingData || !reminderFileDate) {
                if (trainingFileStatus) {
                    trainingFileStatus.innerHTML = `
                        <i class="fa-solid fa-circle-info" style="color: var(--text-muted);"></i>
                        <span>尚未上傳上課提醒資料</span>
                    `;
                }
                return;
            }

            if (trainingFileStatus) {
                trainingFileStatus.innerHTML = `
                    <i class="fa-solid fa-circle-check" style="color: var(--primary-light);"></i>
                    <span>已載入：${reminderFileDate} 版本</span>
                `;
            }
            if (trainingFileNameText) {
                trainingFileNameText.innerHTML = `<i class="fa-solid fa-file-excel" style="color: var(--primary-light); margin-right: 6px;"></i>已成功載入上課提醒檔案 (基準日: ${reminderFileDate})`;
            }

            let maxLimitStr = reminderFileDate.substring(0, 7);
            
            function subtractMonths(dateStr, mCount) {
                if (!dateStr || typeof dateStr !== "string") return "2026-09";
                const parts = dateStr.substring(0, 7).split("-");
                if (parts.length < 2) return "2026-09";
                let y = parseInt(parts[0], 10);
                let m = parseInt(parts[1], 10);
                if (isNaN(y) || isNaN(m)) return "2026-09";
                m -= mCount;
                while (m <= 0) {
                    m += 12;
                    y -= 1;
                }
                return `${y}-${String(m).padStart(2, "0")}`;
            }
            
            function compareMonths(m1, m2) {
                return m1.localeCompare(m2);
            }

            const startMonthStr = reminderFileDate.substring(0, 7);
            
            trainingData.forEach(agent => {
                if (!agent) return;
                const exp = formatExcelDate(agent.expiry);
                if ((agent.internalRemaining > 0 || agent.insuranceRemaining > 0) && exp) {
                    const limit = subtractMonths(exp, 3);
                    if (compareMonths(limit, maxLimitStr) > 0) {
                        maxLimitStr = limit;
                    }
                }
                if (!agent.seniorCompleted || !agent.amlCompleted || !agent.fairCompleted) {
                    const limit = "2026-09";
                    if (compareMonths(limit, maxLimitStr) > 0) {
                        maxLimitStr = limit;
                    }
                }
            });

        const monthList = [];
        let [sY, sM] = startMonthStr.split("-").map(Number);
        let [eY, eM] = maxLimitStr.split("-").map(Number);
        let currY = sY;
        let currM = sM;
        while (currY < eY || (currY === eY && currM <= eM)) {
            monthList.push(`${currY}-${String(currM).padStart(2, "0")}`);
            currM++;
            if (currM > 12) {
                currM = 1;
                currY++;
            }
        }
        
        if (monthList.length === 0) {
            monthList.push(startMonthStr);
        }

        const monthlyPlans = {};
        monthList.forEach(m => {
            monthlyPlans[m] = {};
            SHIFTS_ALL.forEach(name => {
                monthlyPlans[m][name] = {};
            });
        });

        const agentRequiredList = [];

        trainingData.forEach(agent => {
            const name = agent.name;
            const exp = formatExcelDate(agent.expiry);
            const coursesNeeded = [];
            let totalNeeded = 0;
            
            if (agent.internalRemaining > 0) {
                coursesNeeded.push({ course: "公司內訓", count: agent.internalRemaining, expiry: exp, limit: subtractMonths(exp, 3) });
                totalNeeded += agent.internalRemaining;
            }
            if (agent.insuranceRemaining > 0) {
                coursesNeeded.push({ course: "保發中心", count: agent.insuranceRemaining, expiry: exp, limit: subtractMonths(exp, 3) });
                totalNeeded += agent.insuranceRemaining;
            }
            if (!agent.seniorCompleted) {
                coursesNeeded.push({ course: "高齡課程", count: 1, expiry: "2026-12-31", limit: "2026-09" });
                totalNeeded += 1;
            }
            if (!agent.amlCompleted) {
                coursesNeeded.push({ course: "洗防課程", count: 1, expiry: "2026-12-31", limit: "2026-09" });
                totalNeeded += 1;
            }
            if (!agent.fairCompleted) {
                coursesNeeded.push({ course: "公平待客", count: 1, expiry: "2026-12-31", limit: "2026-09" });
                totalNeeded += 1;
            }

            const items1Hour = [];
            const items2Hour = [];
            coursesNeeded.forEach(cReq => {
                const is2Hour = (cReq.course === "高齡課程" || cReq.course === "洗防課程");
                for (let i = 0; i < cReq.count; i++) {
                    if (is2Hour) {
                        items2Hour.push({ course: cReq.course, limit: cReq.limit });
                    } else {
                        items1Hour.push({ course: cReq.course, limit: cReq.limit });
                    }
                }
            });

            // Sort by earliest deadline first (EDF)
            items1Hour.sort((a, b) => a.limit.localeCompare(b.limit));
            items2Hour.sort((a, b) => a.limit.localeCompare(b.limit));

            const alloc1 = {};
            const alloc2 = {};
            monthList.forEach(m => {
                alloc1[m] = [];
                alloc2[m] = [];
            });

            function getAvailMonthsForLimit(limitMonth) {
                const avail = [];
                let [sY, sM] = startMonthStr.split("-").map(Number);
                let [lY, lM] = limitMonth.split("-").map(Number);
                if (isNaN(sY) || isNaN(sM) || isNaN(lY) || isNaN(lM)) {
                    return [startMonthStr];
                }
                let cy = sY, cm = sM;
                while (cy < lY || (cy === lY && cm <= lM)) {
                    avail.push(`${cy}-${String(cm).padStart(2, "0")}`);
                    cm++;
                    if (cm > 12) {
                        cm = 1;
                        cy++;
                    }
                }
                return avail.length > 0 ? avail : [startMonthStr];
            }

            // Distribute 1-hour items (target cap: 2 per month)
            items1Hour.forEach(item => {
                const avail = getAvailMonthsForLimit(item.limit);
                let bestMonth = null;
                let minCount = Infinity;
                
                const monthsBelowCap = avail.filter(m => (alloc1[m] || []).length < 2);
                if (monthsBelowCap.length > 0) {
                    monthsBelowCap.forEach(m => {
                        const count = (alloc1[m] || []).length;
                        if (count < minCount) {
                            minCount = count;
                            bestMonth = m;
                        }
                    });
                } else {
                    avail.forEach(m => {
                        const count = (alloc1[m] || []).length;
                        if (count < minCount) {
                            minCount = count;
                            bestMonth = m;
                        }
                    });
                }
                
                if (bestMonth) {
                    alloc1[bestMonth].push(item.course);
                }
            });

            // Distribute 2-hour items (target cap: 1 per month)
            items2Hour.forEach(item => {
                const avail = getAvailMonthsForLimit(item.limit);
                let bestMonth = null;
                let minCount = Infinity;
                
                const monthsBelowCap = avail.filter(m => (alloc2[m] || []).length < 1);
                if (monthsBelowCap.length > 0) {
                    monthsBelowCap.forEach(m => {
                        const count = (alloc2[m] || []).length;
                        if (count < minCount) {
                            minCount = count;
                            bestMonth = m;
                        }
                    });
                } else {
                    avail.forEach(m => {
                        const count = (alloc2[m] || []).length;
                        if (count < minCount) {
                            minCount = count;
                            bestMonth = m;
                        }
                    });
                }
                
                if (bestMonth) {
                    alloc2[bestMonth].push(item.course);
                }
            });

            // Populated to monthlyPlans
            monthList.forEach(m => {
                const combined = [...(alloc1[m] || []), ...(alloc2[m] || [])];
                combined.forEach(courseName => {
                    if (monthlyPlans[m] && monthlyPlans[m][name]) {
                        monthlyPlans[m][name][courseName] = (monthlyPlans[m][name][courseName] || 0) + 1;
                    }
                });
            });

            let totalArranged = 0;
            savedSchedules.forEach(item => {
                if (!item || item.name !== name) return;
                if (item.course && ["公司內訓", "保發中心", "高齡課程", "洗防課程", "公平待客"].includes(item.course)) {
                    totalArranged++;
                }
            });

            agentRequiredList.push({
                name: name,
                expiry: exp || "2026-12-31",
                coursesNeeded: coursesNeeded,
                totalNeeded: totalNeeded,
                totalArranged: totalArranged
            });
        });

        if (trainingProgressBody) {
            trainingProgressBody.innerHTML = "";
            agentRequiredList.forEach(agent => {
                const tr = document.createElement("tr");
                const progressPct = agent.totalNeeded > 0 ? Math.min(100, Math.round((agent.totalArranged / agent.totalNeeded) * 100)) : 100;
                
                let statusBadge = "";
                if (agent.totalNeeded === 0) {
                    statusBadge = `<span class="training-progress-badge none">無需修課</span>`;
                } else if (agent.totalArranged >= agent.totalNeeded) {
                    statusBadge = `<span class="training-progress-badge completed"><i class="fa-solid fa-circle-check"></i> 已排完</span>`;
                } else {
                    statusBadge = `<span class="training-progress-badge pending">尚缺 ${agent.totalNeeded - agent.totalArranged} 堂</span>`;
                }

                let coursesHTML = "";
                if (agent.coursesNeeded.length === 0) {
                    coursesHTML = `<span style="color: var(--text-muted);">無未完訓項目</span>`;
                } else {
                    coursesHTML = agent.coursesNeeded.map(c => `
                        <div style="margin-bottom: 4px;">
                            <strong>${c.course}</strong>: 需修 ${c.count} 堂 (截止: ${c.limit})
                        </div>
                    `).join("");
                }

                tr.innerHTML = `
                    <td class="strong" style="vertical-align: top;">${agent.name}</td>
                    <td style="vertical-align: top; color: var(--text-secondary);">${agent.expiry}</td>
                    <td style="vertical-align: top;">
                        <div style="margin-bottom: 6px;">${coursesHTML}</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="progress-mini-track" style="flex: 1;">
                                <div class="progress-mini-bar" style="width: ${progressPct}%;"></div>
                            </div>
                            <span style="font-size: 10px; color: var(--text-secondary); min-width: 28px; text-align: right;">${progressPct}%</span>
                            ${statusBadge}
                        </div>
                    </td>
                `;
                trainingProgressBody.appendChild(tr);
            });
        }

        if (trainingMonthsContainer) {
            trainingMonthsContainer.innerHTML = "";
            
            monthList.forEach(m => {
                const card = document.createElement("div");
                card.className = "month-plan-card";
                
                const agentsInMonth = [];
                let totalMonthPlanned = 0;
                let totalMonthArranged = 0;
                
                SHIFTS_ALL.forEach(name => {
                    const plans = monthlyPlans[m][name] || {};
                    const plannedCourses = Object.keys(plans);
                    if (plannedCourses.length > 0) {
                        const arranged = {};
                        savedSchedules.forEach(item => {
                            if (!item || item.name !== name) return;
                            if (!item.date || typeof item.date !== "string") return;
                            const itemMonth = item.date.substring(0, 7);
                            if (itemMonth === m && plannedCourses.includes(item.course)) {
                                arranged[item.course] = (arranged[item.course] || 0) + 1;
                                totalMonthArranged++;
                            }
                        });
                        
                        let agentAllCompleted = true;
                        const coursesDetails = plannedCourses.map(cname => {
                            const plannedCount = plans[cname];
                            const arrangedCount = arranged[cname] || 0;
                            totalMonthPlanned += plannedCount;
                            
                            const isCompleted = arrangedCount >= plannedCount;
                            if (!isCompleted) {
                                agentAllCompleted = false;
                            }
                            
                            return {
                                name: cname,
                                planned: plannedCount,
                                arranged: arrangedCount,
                                completed: isCompleted
                            };
                        });
                        
                        agentsInMonth.push({
                            name: name,
                            courses: coursesDetails,
                            completed: agentAllCompleted
                        });
                    }
                });
                
                if (agentsInMonth.length === 0) return;
                
                const monthParts = m.split("-");
                const titleStr = `${monthParts[0]}年 ${parseInt(monthParts[1], 10)}月`;
                const summaryStr = `規劃排定 ${totalMonthPlanned} 堂，已排 ${totalMonthArranged} 堂`;
                
                let headerStatusBadge = "";
                if (totalMonthArranged >= totalMonthPlanned) {
                    headerStatusBadge = `<span class="training-progress-badge completed" style="font-size: 11px;"><i class="fa-solid fa-circle-check"></i> 本月規劃已排滿</span>`;
                } else {
                    headerStatusBadge = `<span class="training-progress-badge pending" style="font-size: 11px;">本月尚缺 ${totalMonthPlanned - totalMonthArranged} 堂</span>`;
                }

                let agentsHTML = agentsInMonth.map(agent => {
                    const coursesTagsHTML = agent.courses.map(c => {
                        const classStyle = c.completed ? 'completed' : 'pending';
                        const text = c.completed 
                            ? `${c.name} (${c.arranged}/${c.planned}堂)` 
                            : `${c.name} (尚缺 ${c.planned - c.arranged} 堂，已排 ${c.arranged}/${c.planned})`;
                        return `<span class="plan-course-tag ${classStyle} clickable-plan-tag" style="cursor: pointer;" title="點擊調整/移動排課日期" data-agent="${agent.name}" data-course="${c.name}" data-month="${m}"><i class="fa-solid ${c.completed ? 'fa-circle-check' : 'fa-circle-dot'}"></i> ${text} <i class="fa-solid fa-calendar-pen" style="font-size: 10px; margin-left: 4px; opacity: 0.8;"></i></span>`;
                    }).join(" ");
                    
                    return `
                        <div class="month-plan-agent-row">
                            <strong style="width: 80px; color: #fff;">${agent.name}</strong>
                            <div class="month-plan-courses-list" style="flex: 1; margin-left: 10px;">
                                ${coursesTagsHTML}
                            </div>
                        </div>
                    `;
                }).join("");

                card.innerHTML = `
                    <div class="month-plan-header">
                        <div>
                            <span class="month-plan-title"><i class="fa-solid fa-calendar-days" style="margin-right: 6px;"></i>${titleStr}</span>
                            <span class="month-plan-summary" style="margin-left: 12px; color: var(--text-muted);">${summaryStr}</span>
                        </div>
                        ${headerStatusBadge}
                    </div>
                    <div class="month-plan-body">
                        ${agentsHTML}
                    </div>
                `;

                // Bind click listeners for course tags to move dates
                card.querySelectorAll('.clickable-plan-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const agentName = tag.getAttribute('data-agent');
                        const courseName = tag.getAttribute('data-course');
                        const targetMonth = tag.getAttribute('data-month');
                        
                        let matchIdx = savedSchedules.findIndex(s => s.name === agentName && s.course === courseName && s.date && s.date.startsWith(targetMonth));
                        if (matchIdx === -1) {
                            matchIdx = savedSchedules.findIndex(s => s.name === agentName && s.course === courseName);
                        }
                        
                        if (matchIdx !== -1) {
                            const item = savedSchedules[matchIdx];
                            const tempCourse = {
                                date: item.date,
                                start_hour: parseInt(item.time.substring(0, 2), 10) || 9,
                                end_hour: parseInt(item.time.substring(8, 10), 10) || 11,
                                duration: item.duration || 2,
                                course: item.course
                            };
                            showAlternativeSlots(item.name, 1, tempCourse, matchIdx);
                        } else {
                            let resCourse = null;
                            if (scheduleResult && scheduleResult.scheduled_courses && scheduleResult.scheduled_courses[agentName]) {
                                resCourse = scheduleResult.scheduled_courses[agentName].find(c => c.course === courseName);
                            }
                            
                            if (resCourse) {
                                showAlternativeSlots(agentName, resCourse.course_number || 1, resCourse);
                            } else {
                                const newCourseItem = {
                                    name: agentName,
                                    date: `${targetMonth}-01`,
                                    time: "09:00 - 11:00",
                                    duration: 2,
                                    course: courseName
                                };
                                pushArchiveHistory();
                                savedSchedules.push(newCourseItem);
                                const newIdx = savedSchedules.length - 1;
                                renderArchiveTable();
                                autoSaveArchive();
                                
                                const tempCourse = {
                                    date: newCourseItem.date,
                                    start_hour: 9,
                                    end_hour: 11,
                                    duration: 2,
                                    course: courseName
                                };
                                showAlternativeSlots(agentName, 1, tempCourse, newIdx);
                            }
                        }
                    });
                });

                trainingMonthsContainer.appendChild(card);
            });
        }
        } catch (e) {
            console.error("Error inside renderTrainingTab:", e);
        }
    }

    // Fullscreen Expansion Listeners for Training Planner Tab
    const expandPlanBtn = document.getElementById("expand-plan-btn");
    const scheduleCard = document.getElementById("training-schedule-card");

    function toggleFullscreen(card, btn) {
        const isFullscreen = card.classList.toggle("fullscreen-mode");
        const icon = btn.querySelector("i");
        if (icon) {
            icon.className = isFullscreen ? "fa-solid fa-compress" : "fa-solid fa-expand";
        }
        btn.setAttribute("title", isFullscreen ? "縮小檢視" : "放大檢視");
    }

    if (expandPlanBtn && scheduleCard) {
        expandPlanBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFullscreen(scheduleCard, expandPlanBtn);
        });
    }

    document.addEventListener("click", (e) => {
        const fullscreenCard = document.querySelector(".training-plan-card.fullscreen-mode");
        if (fullscreenCard && !fullscreenCard.contains(e.target)) {
            toggleFullscreen(fullscreenCard, expandPlanBtn);
        }
    });

    // Initial render
    renderArchiveTable();
});
