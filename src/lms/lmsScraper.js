const cheerio = require("cheerio");

/**
 * Helper untuk parsing tanggal bahasa Indonesia (Moodle Untad)
 * Contoh: "Jatuh tempo: Jumat, 11 September 2026, 00:00" atau "2 Oktober 2026, 23:59"
 * Mengembalikan timestamp dalam milidetik (UTC)
 */
function parseIndonesianDate(str) {
    if (!str) return null;
    const months = {
        januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
        juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
    };
    const m = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,\s*(\d{1,2})[:.](\d{2}))?/i);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = months[m[2].toLowerCase()];
    if (month === undefined) return null;
    const year = parseInt(m[3], 10);
    const hour = m[4] ? parseInt(m[4], 10) : 23;
    const min = m[5] ? parseInt(m[5], 10) : 59;
    // WITA adalah UTC+8
    return Date.UTC(year, month, day, hour - 8, min);
}

/**
 * Client HTTP sesi Moodle dengan penanganan cookies otomatis
 */
class MoodleSessionClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
        this.cookies = new Map();
        this.userAgent =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
        this.sesskey = null;
    }

    _getCookieString() {
        return Array.from(this.cookies.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join("; ");
    }

    _storeCookies(res) {
        let cookieHeaders = [];
        if (typeof res.headers.getSetCookie === "function") {
            cookieHeaders = res.headers.getSetCookie();
        } else {
            const raw = res.headers.get("set-cookie");
            if (raw) cookieHeaders = [raw];
        }

        for (const str of cookieHeaders) {
            const cookiePart = str.split(";")[0].trim();
            const eqIdx = cookiePart.indexOf("=");
            if (eqIdx > 0) {
                const name = cookiePart.substring(0, eqIdx).trim();
                const value = cookiePart.substring(eqIdx + 1).trim();
                if (name) {
                    this.cookies.set(name, value);
                }
            }
        }
    }

    async request(urlOrPath, options = {}) {
        const url = urlOrPath.startsWith("http")
            ? urlOrPath
            : `${this.baseUrl}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;

        const headers = {
            "User-Agent": this.userAgent,
            ...(options.headers || {})
        };

        const cookieHeader = this._getCookieString();
        if (cookieHeader) {
            headers["Cookie"] = cookieHeader;
        }

        const res = await fetch(url, {
            ...options,
            headers,
            redirect: "manual"
        });

        this._storeCookies(res);

        // Tangani redirect (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(res.status)) {
            const location = res.headers.get("location");
            if (location && options.followRedirect !== false) {
                const redirectUrl = new URL(location, url).toString();
                const nextMethod = res.status === 303 ? "GET" : (options.method || "GET");
                return this.request(redirectUrl, {
                    ...options,
                    method: nextMethod,
                    body: nextMethod === "GET" ? undefined : options.body
                });
            }
        }

        return res;
    }
}

/**
 * Melakukan login ke Moodle LMS
 * @param {MoodleSessionClient} client
 * @param {string} username
 * @param {string} password
 */
async function loginToMoodle(client, username, password) {
    const loginUrl = `${client.baseUrl}/login/index.php`;

    // 1. Ambil halaman login untuk mendapatkan session cookie & logintoken
    const getRes = await client.request(loginUrl, { method: "GET" });
    const getHtml = await getRes.text();

    const $ = cheerio.load(getHtml);
    const logintoken = $('input[name="logintoken"]').val() || "";

    // 2. Kirim POST login
    const bodyParams = new URLSearchParams();
    bodyParams.append("username", username);
    bodyParams.append("password", password);
    if (logintoken) {
        bodyParams.append("logintoken", logintoken);
    }
    bodyParams.append("anchor", "");

    const postRes = await client.request(loginUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": loginUrl
        },
        body: bodyParams.toString()
    });

    const postHtml = await postRes.text();

    const $post = cheerio.load(postHtml);
    const isLoginError =
        $post(".loginerrors").length > 0 ||
        $post("#loginerrormessage").length > 0 ||
        ($post('input[name="password"]').length > 0 && $post('input[name="username"]').length > 0);

    if (isLoginError) {
        const errorText = $post(".loginerrors").text().trim() || "Kredensial username/password salah.";
        throw new Error(`Login LMS gagal: ${errorText}`);
    }

    // Ambil sesskey dari halaman sesudah login jika ada
    const sesskeyMatch = postHtml.match(/"sesskey":"([^"]+)"/);
    if (sesskeyMatch) {
        client.sesskey = sesskeyMatch[1];
    } else {
        // Ambil dari halaman kursusku jika belum dapat
        const cRes = await client.request("/my/courses.php");
        const cHtml = await cRes.text();
        const cMatch = cHtml.match(/"sesskey":"([^"]+)"/);
        if (cMatch) client.sesskey = cMatch[1];
    }

    return true;
}

/**
 * Mengambil daftar 6 mata kuliah aktif semester ini dari menu 'Kursusku' (/my/courses.php)
 * @param {MoodleSessionClient} client
 * @returns {Promise<Array<{ id: number|string, fullname: string, url: string }>>}
 */
async function getKursuskuCourses(client) {
    // 1. Coba ambil via Moodle WebService AJAX (Moodle 4.x standard untuk menu Kursusku)
    if (client.sesskey) {
        try {
            const ajaxRes = await client.request(
                `/lib/ajax/service.php?sesskey=${client.sesskey}&info=core_course_get_enrolled_courses_by_timeline_classification`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify([
                        {
                            index: 0,
                            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                            args: { offset: 0, limit: 50, classification: "all", sort: "fullname" }
                        }
                    ])
                }
            );

            const ajaxData = await ajaxRes.json();
            if (Array.isArray(ajaxData) && !ajaxData[0]?.error && ajaxData[0]?.data?.courses) {
                return ajaxData[0].data.courses.map((c) => ({
                    id: c.id,
                    fullname: c.fullname,
                    url: `${client.baseUrl}/course/view.php?id=${c.id}`
                }));
            }
        } catch (_) {
            // Lanjut ke fallback jika AJAX gagal
        }
    }

    // 2. Fallback: Parse HTML dari /my/courses.php
    const coursesRes = await client.request("/my/courses.php");
    const html = await coursesRes.text();
    const $ = cheerio.load(html);
    const coursesMap = new Map();

    $('a[href*="/course/view.php?id="]').each((_, el) => {
        const href = $(el).attr("href");
        const match = href.match(/id=(\d+)/);
        if (!match) return;

        const id = match[1];
        if (id === "1") return;

        const clone = $(el).clone();
        clone.find(".accesshide, .sr-only, .badge").remove();
        let name = clone.text().replace(/\s+/g, " ").trim();
        if (name && name.length > 2 && !coursesMap.has(id)) {
            coursesMap.set(id, {
                id,
                fullname: name,
                url: `${client.baseUrl}/course/view.php?id=${id}`
            });
        }
    });

    return Array.from(coursesMap.values());
}

/**
 * Mengambil deadline dari kalender Moodle untuk seluruh tugas aktif
 * @param {MoodleSessionClient} client
 * @returns {Promise<Map<string, { timestamp: number, formatted: string }>>}
 */
async function getCalendarDeadlines(client) {
    const deadlineMap = new Map();
    if (!client.sesskey) return deadlineMap;

    try {
        const nowSec = Math.floor(Date.now() / 1000);
        // Ambil event dari 30 hari lalu hingga 60 hari ke depan
        const calRes = await client.request(
            `/lib/ajax/service.php?sesskey=${client.sesskey}&info=core_calendar_get_action_events_by_timesort`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify([
                    {
                        index: 0,
                        methodname: "core_calendar_get_action_events_by_timesort",
                        args: { timesortfrom: nowSec - 86400 * 30, limitnum: 50 }
                    }
                ])
            }
        );

        const calData = await calRes.json();
        if (Array.isArray(calData) && !calData[0]?.error && calData[0]?.data?.events) {
            for (const ev of calData[0].data.events) {
                if (ev.url) {
                    const match = ev.url.match(/id=(\d+)/);
                    if (match) {
                        const ts = ev.timesort * 1000;
                        const formatted = new Date(ts).toLocaleString("id-ID", {
                            timeZone: "Asia/Makassar",
                            dateStyle: "full",
                            timeStyle: "short"
                        });
                        deadlineMap.set(match[1], { timestamp: ts, formatted });
                    }
                }
            }
        }
    } catch (_) {
        // Abaikan jika kalender tidak tersedia
    }

    return deadlineMap;
}

/**
 * Scrape modul Tugas dan Materi di halaman course tertentu
 * @param {MoodleSessionClient} client
 * @param {{ id: number|string, fullname: string, url: string }} course
 * @param {Map<string, { timestamp: number, formatted: string }>} deadlineMap
 */
async function scrapeCourseModules(client, course, deadlineMap = new Map()) {
    const res = await client.request(course.url, { method: "GET" });
    if (res.status !== 200) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const modules = [];
    const seenIds = new Set();

    const activityLinks = $('a[href*="/mod/"]').toArray();

    for (const el of activityLinks) {
        const href = $(el).attr("href");
        if (!href) continue;

        const match = href.match(/\/mod\/([a-z0-9_]+)\/view\.php\?id=(\d+)/i);
        if (!match) continue;

        const rawType = match[1].toLowerCase();
        const cmid = match[2];

        let moduleType = null;
        if (rawType === "assign") {
            moduleType = "TUGAS";
        } else if (["resource", "folder", "url", "page", "book"].includes(rawType)) {
            moduleType = "MATERI";
        }

        if (!moduleType) continue;

        const moduleId = `${rawType}_${cmid}`;
        if (seenIds.has(moduleId)) continue;
        seenIds.add(moduleId);

        const clone = $(el).clone();
        clone.find(".accesshide, .sr-only, .badge").remove();
        let title = clone.text().replace(/\s+/g, " ").trim();

        if (!title || title.length < 2) {
            const parent = $(el).closest(".activityinstance, .activity-item, .mod-indent-outer");
            if (parent.length > 0) {
                const nameEl = parent.find(".instancename, .activityname");
                if (nameEl.length > 0) {
                    const nameClone = nameEl.clone();
                    nameClone.find(".accesshide, .sr-only").remove();
                    title = nameClone.text().replace(/\s+/g, " ").trim();
                }
            }
        }

        if (!title) {
            title = `${moduleType === "TUGAS" ? "Tugas" : "Materi"} #${cmid}`;
        }

        const fullLink = new URL(href, client.baseUrl).toString();

        let deadlineText = "Tidak ada batas waktu";
        let deadlineTs = null;
        let isExpired = false;

        // Jika modul adalah Tugas, cari deadline
        if (moduleType === "TUGAS") {
            if (deadlineMap.has(cmid)) {
                const dl = deadlineMap.get(cmid);
                deadlineText = dl.formatted;
                deadlineTs = dl.timestamp;
                isExpired = dl.timestamp < Date.now();
            } else {
                // Periksa halaman tugas secara langsung jika tidak ada di kalender
                try {
                    const aRes = await client.request(fullLink, { method: "GET" });
                    if (aRes.status === 200) {
                        const aHtml = await aRes.text();
                        const $a = cheerio.load(aHtml);

                        let rawDateStr = "";
                        // Cari pada baris tabel batas waktu/jatuh tempo
                        $a("table.generaltable tr").each((_, tr) => {
                            const th = $a(tr).find("th").text().trim().toLowerCase();
                            const td = $a(tr).find("td").text().trim();
                            if (th.includes("jatuh tempo") || th.includes("batas waktu") || th.includes("due date")) {
                                rawDateStr = td;
                            }
                        });

                        // Jika tidak ada di tabel, cari di region activity-dates
                        if (!rawDateStr) {
                            const dateRegion = $a('[data-region="activity-dates"], .activity-dates').text();
                            const mJatuh = dateRegion.match(/(?:jatuh tempo|batas waktu|due)[:\s]+([^,\n]+,\s*[^,\n]+,\s*[^,\n]+)/i);
                            if (mJatuh) {
                                rawDateStr = mJatuh[1].trim();
                            }
                        }

                        if (rawDateStr) {
                            const parsedTs = parseIndonesianDate(rawDateStr);
                            if (parsedTs) {
                                deadlineTs = parsedTs;
                                deadlineText = new Date(parsedTs).toLocaleString("id-ID", {
                                    timeZone: "Asia/Makassar",
                                    dateStyle: "full",
                                    timeStyle: "short"
                                });
                                isExpired = parsedTs < Date.now();
                            } else {
                                deadlineText = rawDateStr;
                            }
                        }
                    }
                } catch (_) {
                    // Abaikan error pemeriksaan halaman tugas spesifik
                }
            }
        }

        modules.push({
            moduleId,
            cmid,
            courseName: course.fullname,
            title,
            type: moduleType,
            link: fullLink,
            deadlineText,
            deadlineTs,
            isExpired
        });
    }

    return modules;
}

/**
 * Menjalankan proses scrape menyeluruh untuk 6 mata kuliah Kursusku
 * @param {string} lmsUrl
 * @param {string} username
 * @param {string} password
 */
async function scrapeAllLmsModules(lmsUrl, username, password) {
    const client = new MoodleSessionClient(lmsUrl);

    // 1. Login
    await loginToMoodle(client, username, password);

    // 2. Dapatkan 6 mata kuliah di Kursusku
    const courses = await getKursuskuCourses(client);

    // 3. Ambil kalender deadline
    const deadlineMap = await getCalendarDeadlines(client);

    const allDiscoveredModules = [];

    // 4. Scrape modul dari setiap mata kuliah
    for (const course of courses) {
        try {
            const courseModules = await scrapeCourseModules(client, course, deadlineMap);
            allDiscoveredModules.push(...courseModules);
        } catch (err) {
            console.error(`⚠️ Gagal scrape course [${course.fullname}]:`, err?.message || err);
        }
    }

    return {
        courses,
        modules: allDiscoveredModules
    };
}

module.exports = {
    MoodleSessionClient,
    loginToMoodle,
    getKursuskuCourses,
    getCalendarDeadlines,
    scrapeCourseModules,
    scrapeAllLmsModules
};
