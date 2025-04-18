function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

// ################################## API FETCHING ############################################

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
        console.error("Error while getting Wikipedia summary:", error);
        return null;
    }
}

async function get_images(title) {
    const endpoint = 'https://en.wikipedia.org/w/api.php';
    const params = new URLSearchParams({
        action: 'query',
        generator: 'images',      // This gets all images
        titles: title,
        prop: 'imageinfo',       // This gets image metadata
        iiprop: 'url|mime',     // We want the URL and MIME type
        gimlimit: 'max',        // Get maximum number of images
        format: 'json',
        origin: '*'  // Helps with CORS in development
    });

    try {
        const response = await fetch(`${endpoint}?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const image_data  = Object.values(data.query.pages)
            .filter(page => page.imageinfo && page.imageinfo[0].mime.startsWith('image/'))
            .map(page => ({
                url: page.imageinfo[0].url,
                title: page.title.replace('File:', ''),
                descriptionUrl: page.imageinfo[0].descriptionurl
            }));
        console.log('image_data: ', image_data)
        return image_data
        }
        catch (error) {
            console.error("Error while getting Wikipedia images:", error);
            return null;
        }
}

// ################################### IMAGE HANDLING FUNCTIONS ##################################
// Show specific image
function showImage(index) {
    const items = document.querySelectorAll('.gallery-item');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    items.forEach(item => item.style.display = 'none');
    thumbnails.forEach(thumb => thumb.classList.remove('active'));
    
    items[index].style.display = 'flex';
    thumbnails[index].classList.add('active');
    let currentIndex = index;
    console.log('image index: ', currentIndex)
    return currentIndex;
}

// Navigation functions
function nextImage(currentIndex, imageData) {
    const nextIndex = (currentIndex + 1) % imageData.length;
    showImage(nextIndex);
    return nextIndex;
}

function prevImage(currentIndex, imageData) {
    const prevIndex = (currentIndex - 1 + imageData.length) % imageData.length;
    showImage(prevIndex);
    return prevIndex;
}

// ################################### API RESULT TO DIVS ##################################

async function load_paragraph(title){
    const paragraph_container = document.getElementById("wiki_summary_div");
    paragraph_container.innerHTML = "Loading...";
    
    const content = await get_paragraph(title);
    paragraph_container.innerHTML = '';
    const paragraphs = content.split(/\n/);
    console.log('text fetched: \n', content)
    paragraphs.forEach(paragraphText  => {
        if (paragraphText.trim()) {
            const p = document.createElement('p');
            p.textContent = paragraphText.trim();
            paragraph_container.appendChild(p);
        }
    });
}

async function load_svgs(title){
    let svgData = await get_images(title);

    svgData = svgData.filter(image => 
        image.url.toLowerCase().includes('.svg')
    );
    const sizeSvg = svgData.find(image => image.url.toLowerCase().includes('size'));
    const rangeSvg = svgData.find(image => image.url.toLowerCase().includes('range'));
    const enSvg = svgData.find(image => image.url.toLowerCase().includes('status'));

    const svgContainer = document.getElementById('svgContainer');
    svgContainer.innerHTML = '';

    [sizeSvg, rangeSvg, enSvg].forEach(svg => {
            const img = document.createElement('img');
            img.src = svg.url;
            img.alt = svg.title || 'SVG image';
            svgContainer.appendChild(img);
    });
}

async function load_gallery(title){
    let imageData = await get_images(title);
    const gallery = document.getElementById('gallery');
    const thumbnailsContainer = document.getElementById('thumbnails');

    imageData = imageData.filter(image => 
        image.url.toLowerCase().endsWith('.jpg') || 
        image.url.toLowerCase().endsWith('.jpeg')
    );
    imageData = imageData.slice(0, 8);

    thumbnailsContainer.innerHTML = '';

    let currentIndex = 0;
    
    imageData.forEach((image, index) => {
        // Main gallery image
        const imgContainer = document.createElement('div');
        imgContainer.innerHTML = '';
        imgContainer.className = 'gallery-item';
        imgContainer.style.display = index === 0 ? 'flex' : 'none';
        
        const img = document.createElement('img');
        img.innerHTML = '';
        img.src = image.url;
        img.alt = image.title;
        img.className = 'gallery-image';
        
        imgContainer.appendChild(img);
        gallery.appendChild(imgContainer);
        
        //Thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.src = image.url;
        thumbnail.alt = image.title;
        thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
        thumbnail.addEventListener('click', () => {
            currentIndex = showImage(index);
        });
        thumbnailsContainer.appendChild(thumbnail);
        });
    
    // gallery navigation
    const galery_nextBtn = document.getElementById('nextBtn');
    const galery_prevBtn = document.getElementById('prevBtn');    
    galery_nextBtn.addEventListener('click', () => {currentIndex = nextImage(currentIndex, imageData)});
    galery_prevBtn.addEventListener('click', () => {currentIndex = prevImage(currentIndex, imageData)});
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') currentIndex = nextImage(currentIndex, imageData);
        if (e.key === 'ArrowLeft') currentIndex = prevImage(currentIndex, imageData);
    });

}


// ############################### FUNCTION CALLS #########################################
let title = 'blue whale';

async function loadContent(title) {
    load_paragraph(title);
    load_gallery(title);
    load_svgs(title);
}


// ###################################################################################

function handleSearch(input) {
    const query = input.value.trim();
    if (query) {
        console.log('User searched for:', query);
        loadContent(query);
    }
}

loadContent(title);


whenDocumentLoaded(() => {
	
    //buttons
	const btn_sound = document.getElementById('btn-sound');
	btn_sound.addEventListener('click', () => {
		console.log('The sound button was clicked');
	});

	const btn_search = document.getElementById('btn-search');
    const search_input = document.getElementById('query-species');
    btn_search.addEventListener('click', handleSearch);
    search_input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch(search_input);
        }
    });
});

// ###################################################################################
