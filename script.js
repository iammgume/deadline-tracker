
const durationInput = document.getElementById("duration-hours");
const startButton = document.getElementById("start-button");
const stopButton = document.getElementById("stop-button");

const timerStatus = document.getElementById("timer-status");
const timeDisplay = document.getElementById("time-display");
const progressRing = document.getElementById("progress-bar");
const ringPercentage = document.getElementById("ring-percentage");

const overtimeRing = document.getElementById("overtime-ring");
const overtimeRingPercentage = document.getElementById(
    "overtime-ring-percentage"
);

const modeSwitchButton = document.getElementById("mode-switch-button");
const progressText = document.getElementById("progress-text");

const timerSummary = document.getElementById("timer-summary");
const targetDurationText = document.getElementById("target-duration");
const actualElapsedText = document.getElementById("actual-elapsed");
const finalProgressText = document.getElementById("final-progress");
const finalResultText = document.getElementById("final-result");
const overtimePercentageText = document.getElementById(
    "overtime-percentage"
);

const themeToggleButton = document.getElementById("theme-toggle-button");

let targetDuration = 0;
let startTime = 0;
let elapsedSeconds = 0;
let timerInterval = null;
let isRunning = false;
let displayMode = "elapsed";


/*
 * THEME SETTINGS
 *
 * On first use, follow the operating system's theme.
 * The user can toggle directly between Light and Dark.
 * Manual choices are remembered on the device.
 */

const themeStorageKey = "deadline-tracker-theme";

function getSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(themeStorageKey);

        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }
    } catch (error) {
        console.warn("Could not read the saved theme:", error);
    }

    return "system";
}

let themePreference = getSavedTheme();

function applyTheme() {
    const root = document.documentElement;

    if (themePreference === "system") {
        root.removeAttribute("data-theme");
    } else {
        root.setAttribute("data-theme", themePreference);
    }

    themeToggleButton.textContent =
        themePreference === "dark"
            ? "Switch to Light"
            : "Switch to Dark";

    themeToggleButton.setAttribute(
        "aria-label",
        themeToggleButton.textContent
    );

    try {
        if (themePreference === "system") {
            localStorage.removeItem(themeStorageKey);
        } else {
            localStorage.setItem(themeStorageKey, themePreference);
        }
    } catch (error) {
        console.warn("Could not save the theme preference:", error);
    }
}

function switchTheme() {
    if (themePreference === "system") {
        const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;

        themePreference = systemPrefersDark ? "light" : "dark";
    } else {
        themePreference =
            themePreference === "light" ? "dark" : "light";
    }

    applyTheme();
}

themeToggleButton.addEventListener("click", switchTheme);

applyTheme();


/*
 * FORMAT TIME
 */

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));

    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}


/*
 * UPDATE TIMER DISPLAY
 */

function updateTimer() {
    elapsedSeconds = (Date.now() - startTime) / 1000;

    const remainingSeconds = targetDuration - elapsedSeconds;

    const targetProgress = Math.min(
        (elapsedSeconds / targetDuration) * 100,
        100
    );

    const overtimeSeconds = Math.max(
        0,
        elapsedSeconds - targetDuration
    );

    /*
     * Outer ring: target progress.
     * The unfilled section follows the active theme.
     */

    progressRing.style.background = `conic-gradient(
        #17e064 0%,
        #17e064 ${targetProgress}%,
        var(--ring-track) ${targetProgress}%,
        var(--ring-track) 100%
    )`;

    ringPercentage.textContent =
        `${Math.floor(targetProgress)}%`;

    progressRing.setAttribute(
        "aria-valuenow",
        String(Math.round(targetProgress))
    );

    /*
     * Inner ring: overtime progress.
     * Each complete cycle represents one target-duration
     * interval of overtime.
     */

    if (overtimeSeconds > 0) {
        const overtimeCycleProgress =
            ((overtimeSeconds % targetDuration) / targetDuration) * 100;

        overtimeRing.classList.add("active");

        overtimeRing.style.background = `conic-gradient(
            #f59e0b 0%,
            #f59e0b ${overtimeCycleProgress}%,
            var(--ring-track) ${overtimeCycleProgress}%,
            var(--ring-track) 100%
        )`;

        overtimeRingPercentage.hidden = false;

        overtimeRingPercentage.textContent =
            `Overtime cycle: ${Math.floor(overtimeCycleProgress)}%`;
    } else {
        overtimeRing.classList.remove("active");
        overtimeRingPercentage.hidden = true;
    }

    /*
     * Central timer: elapsed or remaining time.
     */

    if (displayMode === "elapsed") {
        timeDisplay.textContent = formatTime(elapsedSeconds);

        modeSwitchButton.textContent =
            "Switch to time remaining";
    } else {
        timeDisplay.textContent = remainingSeconds > 0
            ? formatTime(remainingSeconds)
            : `+${formatTime(overtimeSeconds)}`;

        modeSwitchButton.textContent =
            "Switch to time elapsed";
    }

    /*
     * Status beneath the ring.
     */

    if (remainingSeconds > 0) {
        timerStatus.textContent = "Time remaining";

        progressText.textContent =
            `Target progress: ${targetProgress.toFixed(1)}%`;
    } else {
        timerStatus.textContent = "Overtime";

        progressText.textContent =
            `Target reached. Overtime: ${formatTime(overtimeSeconds)}`;
    }
}


/*
 * START TIMER
 */

function startTimer() {
    const hours = Number(durationInput.value);

    if (!Number.isFinite(hours) || hours <= 0) {
        timerStatus.textContent =
            "Please enter a target duration greater than zero.";

        durationInput.focus();
        return;
    }

    clearInterval(timerInterval);

    targetDuration = hours * 3600;
    startTime = Date.now();
    elapsedSeconds = 0;
    displayMode = "elapsed";
    isRunning = true;

    timerSummary.hidden = true;
    overtimePercentageText.hidden = true;

    startButton.disabled = true;
    stopButton.disabled = false;
    durationInput.disabled = true;
    modeSwitchButton.disabled = false;

    updateTimer();

    timerInterval = setInterval(updateTimer, 250);
}


/*
 * STOP TIMER AND DISPLAY SUMMARY
 */

function stopTimer() {
    if (!isRunning) {
        return;
    }

    updateTimer();

    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    startButton.disabled = false;
    stopButton.disabled = true;
    durationInput.disabled = false;
    modeSwitchButton.disabled = false;

    const elapsed = elapsedSeconds;
    const remaining = targetDuration - elapsed;

    const targetProgress = Math.min(
        (elapsed / targetDuration) * 100,
        100
    );

    const overtimeSeconds = Math.max(
        0,
        elapsed - targetDuration
    );

    const overtimePercentage =
        (overtimeSeconds / targetDuration) * 100;

    /*
     * Fill in the summary.
     */

    targetDurationText.textContent =
        `Target duration: ${formatTime(targetDuration)}`;

    actualElapsedText.textContent =
        `Actual elapsed time: ${formatTime(elapsed)}`;

    finalProgressText.textContent =
        `Target progress: ${targetProgress.toFixed(1)}%`;

    if (remaining > 0) {
        finalResultText.textContent =
            `Time remaining when stopped: ${formatTime(remaining)}`;

        overtimePercentageText.hidden = true;
        overtimePercentageText.textContent = "";
    } else {
        finalResultText.textContent =
            `Overtime: ${formatTime(overtimeSeconds)}`;

        overtimePercentageText.textContent =
            `Overtime percentage: ${overtimePercentage.toFixed(1)}%`;

        overtimePercentageText.hidden = false;
    }

    timerStatus.textContent = "Timer stopped";
    timerSummary.hidden = false;
}


/*
 * SWITCH BETWEEN ELAPSED AND REMAINING TIME
 */

function switchDisplayMode() {
    displayMode = displayMode === "elapsed"
        ? "remaining"
        : "elapsed";

    if (isRunning) {
        updateTimer();
        return;
    }

    /*
     * Switching the display after stopping does not
     * restart the timer or change the recorded duration.
     */

    const remainingSeconds = targetDuration - elapsedSeconds;
    const overtimeSeconds = Math.max(0, -remainingSeconds);

    if (displayMode === "elapsed") {
        timeDisplay.textContent = formatTime(elapsedSeconds);

        modeSwitchButton.textContent =
            "Switch to time remaining";
    } else {
        timeDisplay.textContent = remainingSeconds > 0
            ? formatTime(remainingSeconds)
            : `+${formatTime(overtimeSeconds)}`;

        modeSwitchButton.textContent =
            "Switch to time elapsed";
    }
}


/*
 * EVENT LISTENERS
 */

startButton.addEventListener("click", startTimer);
stopButton.addEventListener("click", stopTimer);
modeSwitchButton.addEventListener("click", switchDisplayMode);


/*
 * SERVICE WORKER
 *
 * Preserves the existing offline functionality.
 */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("Service worker registered successfully.");
            })
            .catch((error) => {
                console.error("Service worker registration failed:", error);
            });
    });
}
