import axios from 'axios';

async function profile() {
    const query = "Ahmed Khatri";
    console.log(`Profiling query: ${query}`);

    console.time("Identify API");
    let identifyRes;
    try {
        identifyRes = await axios.post("http://localhost:5000/api/multi-search/identify", {
            name: query
        });
        console.timeEnd("Identify API");
        console.log(`Identify payload size: ${JSON.stringify(identifyRes.data).length / 1024} KB`);
    } catch (e) {
        console.timeEnd("Identify API");
        console.error("Identify failed", e.message);
        return;
    }

    const candidate = identifyRes.data.candidates ? identifyRes.data.candidates[0] : identifyRes.data.resolvedPersona;
    if (!candidate) {
        console.log("No candidate found");
        return;
    }

    console.time("Deep API");
    try {
        const deepRes = await axios.post("http://localhost:5000/api/multi-search/deep", {
            person: candidate
        });
        console.timeEnd("Deep API");
        console.log(`Deep payload size: ${JSON.stringify(deepRes.data).length / 1024} KB`);
    } catch (e) {
        console.timeEnd("Deep API");
        console.error("Deep failed", e.message);
    }
}

profile();
