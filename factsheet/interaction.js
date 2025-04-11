function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

async function get_paragraph(title) {
    const endpoint = 'https://en.wikipedia.org/w/api.php';
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        titles: title,
        prop: "extracts",
        exintro: true,
        explaintext: true,
        origin: "*"  // Helps with CORS in development
    });

    try {
        const response = await fetch(`${endpoint}?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        return pages[pageId].extract;
    } catch (error) {
        console.error("Error fetching Wikipedia data:", error);
        return null;
    }
}


async function loadContent() {
    const container = document.getElementById("wiki_summary_div");
    container.innerHTML = "Loading...";
    
    const content = await get_paragraph("Blue whale");
    container.innerHTML = '';
    const paragraphs = content.split(/\n/);
    console.log('text fetched: \n', content)
    paragraphs.forEach(paragraphText  => {
        if (paragraphText.trim()) {
            const p = document.createElement('p');
            p.textContent = paragraphText.trim();
            container.appendChild(p);
        }
    });
}


whenDocumentLoaded(() => {
	
    //buttons
	const btn_sound = document.getElementById('btn-sound');

	btn_sound.addEventListener('click', () => {
		console.log('The sound button was clicked');
	});

	const btn_search = document.getElementById('btn-search');

	btn_search.addEventListener('click', () => {
		console.log('The search button was clicked');
	});
});

loadContent();