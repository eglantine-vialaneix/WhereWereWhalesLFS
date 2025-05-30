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
    
    this.resolvePromise = null;
    
    // Close handlers
    this.popup.querySelector('.popup-close').addEventListener('click', () => this.close());
    this.popup.addEventListener('click', (e) => {
      if (e.target === this.popup) this.close();
    });
  }

  setContent(content) {
    this.popup.querySelector('.popup-body').innerHTML = content;
  }

  open() {
    this.popup.classList.add('active');
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  close(selectedValue = null) {
    this.popup.classList.remove('active');
    if (this.resolvePromise) {
      this.resolvePromise(selectedValue);
    }
    setTimeout(() => this.popup.remove(), 300); // Optional: Remove after animation
  }
}


// ################################## TITLE CREATION ############################################

async function setPageTitle(title) {
    // Get the h1 element by its ID
    const response = await fetch('data/cetacean_names.json');
    const data = await response.json();
    let searchInput = title.toLowerCase();
    console.log('searchInput: ', searchInput)

    
    // 1. First try exact matches
    const exactMatch_rows = data.filter(item => 
        item['Scientific name'].toLowerCase() === searchInput || 
        item['Common name'].toLowerCase() === searchInput
        );
    sci_name = exactMatch_rows[0]['Scientific name']
    common_name = exactMatch_rows[0]['Common name']
    console.log('sciname: ', sci_name)
    console.log('common_name: ', common_name)
    const pageTitle = common_name + ' ' + sci_name
    // Check if the element exists
    title_element = document.getElementById('whale-title')
    title_element.setContent(pageTitle)
}

async function setPageTitle(title) {
    try {
        const response = await fetch('data/cetacean_names.json');
        const data = await response.json();
        const searchInput = title.toLowerCase();
        
        // Find matching entry
        const exactMatch = data.find(item => 
            item['Scientific name'].toLowerCase() === searchInput || 
            item['Common name'].toLowerCase() === searchInput
        );
        
        if (exactMatch) {
            const titleElement = document.getElementById('whale-title');
            
            // Create HTML content with formatting
            titleElement.innerHTML = `
                <strong>${exactMatch['Common name']}</strong>
                <span class="scientific-name">${exactMatch['Scientific name']}</span>
            `;
        } else {
            console.warn('No matching cetacean found');
            document.getElementById('whale-title').textContent = title;
        }
    } catch (error) {
        console.error('Error setting page title:', error);
        document.getElementById('whale-title').textContent = title;
    }
}

// ################################## API FETCHING ############################################

async function get_paragraph(title) {
    if(title == 'Beluga'){
        title = 'Beluga whale'
    }
    if(title == "Eden's whale"){
        title = "Bryde's whale"
    }
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
    if(title == 'Beluga'){
        title = 'Beluga whale'
    }
    if(title == "Eden's whale"){
        title = "Bryde's whale"
    }
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

// ################################### IMAGE HANDLING FOR GALERY ##################################
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

    const sizeSvg = svgData.find(image => image.url.toLowerCase().includes('size'));
    const rangeSvgs = svgData.filter(image => {
                                        const url = image.url.toLowerCase();
                                        return url.includes('range') || url.includes('map') || url.includes('distribution');
                                    });
    const enSvg = svgData.find(image => image.url.toLowerCase().includes('status'));

    const svgContainer = document.getElementById('svgContainer');
    svgContainer.innerHTML = '';


    const allSvgs = [...rangeSvgs];
    if (sizeSvg) allSvgs.push(sizeSvg);
    if (enSvg) allSvgs.push(enSvg);

    allSvgs.forEach(svg => {
        if (svg) {  // Only proceed if SVG exists
            const img = document.createElement('img');
            img.src = svg.url;
            img.alt = svg.title || 'SVG image';
            svgContainer.appendChild(img);
        }
    });
}

async function load_gallery(title){
    let imageData = await get_images(title);
    console.log(imageData)

    const gallery = document.getElementById('gallery');
    const thumbnailsContainer = document.getElementById('thumbnails');

    // Clear previous content
    gallery.innerHTML = '';
    thumbnailsContainer.innerHTML = '';

    // filter for jpeg and jpg
    imageData = imageData.filter(image => 
        image.url.toLowerCase().endsWith('.jpg') || 
        image.url.toLowerCase().endsWith('.jpeg') ||
        image.url.toLowerCase().endsWith('.png')
    );

    // filter out unrelated images
    imageData = imageData.filter(image => 
        !image.url.toLowerCase().includes('yellow.tang') &&
        !image.url.toLowerCase().includes('okapi2.jpg') &&
        !image.url.toLowerCase().includes('perm_whale_fluke') &&
        !image.url.includes('range') &&
        !image.url.includes('map') &&
        !image.url.includes('distribution') &&
        !image.url.toLowerCase().includes('euphausia') &&
        !image.url.toLowerCase().includes('wapiti')
    );


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
    
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') currentIndex = nextImage(currentIndex, imageData);
        if (e.key === 'ArrowLeft') currentIndex = prevImage(currentIndex, imageData);
    });

}


// ################################# SEARCH INPUT HANDLING #################################

// Helper function to find similar names
function findSimilarNames(data, searchTerm) {
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

async function propose_similar_results(similarResults) {
  const popup = new Popup();
  
  const content = `
    <h3>Did you mean:</h3>
    <ul class="similar-results-list">
      ${similarResults.map(result => `
        <li data-scientific="${result['Scientific name']}" data-common="${result['Common name']}">
          <strong>${result['Common name']}</strong> (${result['Scientific name']})
        </li>
      `).join('')}
    </ul>
  `;
  
  popup.setContent(content);
  
  // Add click handlers to each list item
  const listItems = popup.popup.querySelectorAll('.similar-results-list li');
  listItems.forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      popup.close({
        scientific: item.dataset.scientific,
        common: item.dataset.common
      });
    });
  });

  // Wait for user selection or popup close
  const selected = await popup.open();
  console.log('selected value: ', selected)
  return selected; // Returns null if closed without selection
}

async function get_name_json(input) {
    try {
        const response = await fetch('data/cetacean_names.json');
        const data = await response.json();
        const searchInput = input.toLowerCase();
        
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
        if (similarResults.length === 0){
            console.log('input does not match any cetaceans');
            return 'not found';
        }
        console.log("Similar names:", similarResults);
        selected_similar_result = await propose_similar_results(similarResults);
        if (selected_similar_result == null){
            return 'popup closed'
        }
        return selected_similar_result.common;

    } catch (error) {
        console.error('error trying to get name from json or propose similar name:', error);
    }
  }


async function handleSearch(input, isInitialSearch = false) {
    const problem_names = ['Sagmatias australis', 'Sagmatias obscurus', 'Sagmatias obliquidens', 'Leucopleurus acutus'];
    if(problem_names.includes(input)){
        
    }
    let title = await get_name_json(input);

    console.log('title from get name json: ', title);
    
    if (title === 'popup closed') return;
    if (title !== 'not found') {
        if (isInitialSearch) {
            navigateToProfiles(title);
        } else {
            loadProfilePage(title);
        }
        return;
    }
    
    // Show "not found" popup
    const popup = new Popup();
    const content = `
        <h3>No matches found</h3>
        <div class="no-results-message">
            Your search for "<strong>${input}</strong>" did not match any cetaceans.
            <br><br>
            Please try a different name (e.g., "Killer Whale" or "Orcinus orca").
        </div>
    `;
    popup.setContent(content);
    popup.open();
}

// ############################### Wikipedia link button ##################################

async function getWikiLink(title) {
    const endpoint = 'https://en.wikipedia.org/w/api.php';
    const params = new URLSearchParams({
        action: 'query',
        titles: title,
        format: 'json',
        origin: '*'
    });

    try {
        const response = await fetch(`${endpoint}?${params}`);
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId !== '-1') {
            return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
        } else {
            console.warn('Wikipedia article not found');
            return null;
        }
    } catch (error) {
        console.error('Error checking Wikipedia:', error);
        return null;
    }
}

async function wikibutton(title) {
    const wikiButton = document.getElementById('wikiButton');
    const wikiUrl = await getWikiLink(title);
    
    if (wikiUrl) {
        wikiButton.style.display = 'inline-block';
        wikiButton.onclick = () => window.open(wikiUrl, '_blank');
    } else {
        wikiButton.style.display = 'none';
    }
}

// ################################# MAPS LINK #####################################
function capitalizeAfterSpace(str) {
  return str
    .split(' ') // Split into words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' '); // Rejoin into a single string
}

async function adjust_maps_link(title){
    const response = await fetch('data/cetacean_names.json');
    const data = await response.json();
    console.log('data: ', data)
    console.log('title: ', title)
    const row = data.filter(item => 
        item['Common name'].toLowerCase() === title.toLowerCase()
        );
    console.log(row)
    const scientific_name = capitalizeAfterSpace(row[0]['Scientific name']);
    map_link = document.getElementById('map-link');
    map_link.href = `maps.html?title=${encodeURIComponent(scientific_name)}`;
}

// ############################### FUNCTION CALLS #########################################

async function loadProfilePage(title) {
    setPageTitle(title);
    load_paragraph(title);
    load_gallery(title);
    load_svgs(title);
    wikibutton(title);
    adjust_maps_link(title);
}

// ###################################################################################
// ############################### SEARCH PAGE #######################################
// ###################################################################################

function navigateToProfiles(searchTerm) {
    // Encode special characters for URL
    const encodedTerm = encodeURIComponent(searchTerm); 
    window.location.href = `profiles.html?search=${encodedTerm}`;
}

function handleProfilesPageLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    
    if (searchTerm) {
        const decodedTerm = decodeURIComponent(searchTerm);
        // Load content for the searched term
        handleSearch(decodedTerm);
    } else {
        // Load default content
        loadProfilePage('blue whale');
    }
}

// Initialize based on current page

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('profiles_search.html')) {
        document.getElementById('main-search-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('registered!!!')
            const input = document.getElementById('main-search-input');
            if (input.value) {
                handleSearch(input.value, true); // true for initial search
            }
        });
    } 
    if (window.location.pathname.includes('profiles.html')) {
        handleProfilesPageLoad();
        const btn_search = document.getElementById('btn-search');
        const search_input = document.getElementById('search-input');
        
        btn_search.addEventListener('click', (e) => {
            e.preventDefault();
            handleSearch(search_input.value);
        });
        
        search_input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(search_input.value);
            }
        });
    }
});

const infoBtn = document.getElementById('info-button');
const disclaimerModal = document.getElementById('disclaimerModal');
const closeBtn = document.getElementById('closeDisclaimer');

infoBtn.addEventListener('click', () => {
  disclaimerModal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
  disclaimerModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
  if (event.target === disclaimerModal) {
    disclaimerModal.style.display = 'none';
  }
});
