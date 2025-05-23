function whenDocumentLoaded(action) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", action);
	} else {
		// `DOMContentLoaded` already fired
		action();
	}
}

class Popup {
  constructor() {
    this.popup = document.createElement('div');
    this.popup.className = 'popup-overlay';
    this.popup.innerHTML = `
      <div class="popup-content">
        <button class="popup-close">&times;</button>
        <div class="popup-body"></div>
      </div>
    `;
    document.body.appendChild(this.popup);
    
    // Close on X button
    this.popup.querySelector('.popup-close').addEventListener('click', () => this.close());
    
    // Close on outside click
    this.popup.addEventListener('click', (e) => {
      if (e.target === this.popup) this.close();
    });
  }

  setContent(content) {
    this.popup.querySelector('.popup-body').innerHTML = content;
  }

  open() {
    this.popup.classList.add('active');
  }

  close() {
    this.popup.classList.remove('active');
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
            throw new Error(`HTTP error while searching title wikipedia api with! status: ${response.status}`);
        }
        const data = await response.json();
        const image_data  = Object.values(data.query.pages)
            .filter(page => page.imageinfo && page.imageinfo[0].mime.startsWith('image/'))
            .map(page => ({
                url: page.imageinfo[0].url,
                title: page.title.replace('File:', ''),
                descriptionUrl: page.imageinfo[0].descriptionurl
            }));
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

async function setPageTitle(title) {
    // Get the h1 element by its ID
    const titleElement = document.getElementById('whale-title');

    const pageTitle = 'combination of name and latin name from table'
    // Check if the element exists
    if (titleElement) {
        // Set the text content of the h1 element
        titleElement.textContent = pageTitle;
    } else {
        // Log an error if the element is not found
        console.error('Error: Main title element not found!');
    }
}

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
    setPageTitle(title);
    load_paragraph(title);
    load_gallery(title);
    load_svgs(title);
}


// ################################# SEARCH INPUT HANDLING #################################

// Helper function to find similar names
function findSimilarNames(data, searchTerm) {
    console.log('in findsimilar')
    return data
        .map(row => {
        const sciNameScore = similarityScore(row['Scientific name'].toLowerCase(), searchTerm);
        const latinNameScore = similarityScore(row['Common name'].toLowerCase(), searchTerm);
        return {
            ...row,
            score: Math.max(sciNameScore, latinNameScore) // Use the higher of the two scores
        };
        })
        .filter(row => row.score > 0.4) // Only include reasonably similar matches
        .sort((a, b) => b.score - a.score) // Sort by similarity score (best first)
        .slice(0, 5) // Return top 5 matches
        .map(row => ({ // Extract only the fields you need
            'Scientific name': row['Scientific name'],
            'Common name': row['Common name'],
        }));
}

// Simple similarity scoring function (Levenshtein distance-based)
function similarityScore(a, b) {
  if (a.includes(b) || b.includes(a)) return 0.8; // Partial match bonus
  if (a === b) return 1;
  
  // Levenshtein distance implementation
  const distance = levenshteinDistance(a, b);
  const longestLength = Math.max(a.length, b.length);
  return 1 - distance / longestLength;
}

// Basic Levenshtein distance implementation
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function propose_similar_results(similarResults) {
  const popup = new Popup();
  
  // Format results as HTML
  const content = `
    <h3>Did you mean:</h3>
    <ul>
      ${similarResults.map(result =>
        `<li>
          <strong>${result['Common name']}</strong> (${result['Scientific name']})
        </li>`
      ).join('')}
    </ul>
  `;
  
  popup.setContent(content);
  popup.open();
}

async function get_name_json() {
    try {
        const response = await fetch('cetacean_names.json');
        const data = await response.json();
        console.log(data);
        const searchInput = document.getElementById('search-input').value.toLowerCase();
        
        // 1. First try exact matches
        const exactMatch_rows = data.filter(item => 
        item['Scientific name'].toLowerCase() === searchInput || 
        item['Common name'].toLowerCase() === searchInput
        );
        if (exactMatch_rows.length > 0) {
            return exactMatch_rows[0]['Common name']
        }
        // 2. If no exact matches, find similar names
        const similarResults = findSimilarNames(data, searchInput);
        console.log("Similar names:", similarResults);
        propose_similar_results(similarResults);
        return; // This returns a Promise that resolves with the data
    } catch (error) {
        console.error('error trying to get name from json or propose similar name:', error);
    }
  }


function handleSearch() {
    const title = get_name_json();

    if (title == 'not found') {
        console.log('User searched for:', query);
        loadContent(query);
        // request user to give new input
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
    const search_input = document.getElementById('search-input');
    btn_search.addEventListener('click', handleSearch);
    search_input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
});

// ###################################################################################
