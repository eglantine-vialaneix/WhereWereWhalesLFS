import os
import requests
from bs4 import BeautifulSoup, Tag
from tqdm import tqdm
import json
import pandas as pd


class WikiImageScrapper:
    def __init__(self, 
                 wiki_urls_df,
                 my_folder='wiki_images', 
                 #query='http://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=', 
                 HEADERS={"User-Agent": "WhereWereWhales: cetaceans images from Wikipedia"}
                 ):
        
        # Set the folder name where images will be stored
        self.my_folder = my_folder
        os.makedirs(my_folder, exist_ok=True)

        # Base URL for Wikipedia API
        #self.query = query

        # Define User-Agent header to respect Wikipedia's user-client policy :,)
        self.headers = HEADERS
        
        # Define the dataframe of scientific names, common names and wikipedia URLs
        # of the wikipedia pages we will scrap the images from
        self.wiki_urls_df = wiki_urls_df


    def get_wiki_urls_from_names(self):
        """
        Given the scientific names in self.wiki_urls_df, fetch the corresponding Wikipedia page URLs using the Wikipedia API.
        Updates self.wiki_urls_df with the retrieved URLs.
        """
        base_search_url = "https://en.wikipedia.org/w/api.php"

        updated_urls = []

        for _, row in tqdm(self.wiki_urls_df.iterrows(), desc="Searching Wikipedia pages", unit=" names"):
            sc_name = row["Scientific name"]

            params = {
                "action": "query",
                "list": "search",
                "srsearch": sc_name,
                "format": "json"
            }

            try:
                response = requests.get(base_search_url, headers=self.headers, params=params)
                response.raise_for_status()
                data = response.json()

                if data["query"]["search"]:
                    # Get the title of the first search result
                    page_title = data["query"]["search"][0]["title"]
                    page_url = f"https://en.wikipedia.org/wiki/{page_title.replace(' ', '_')}"
                else:
                    page_url = None
                    print(f"No results for {sc_name}")

            except Exception as e:
                print(f"Error searching for {sc_name}: {e}")
                page_url = None

            updated_urls.append(page_url)

        # Add the new URLs to the dataframe
        self.wiki_urls_df["Wikipedia page URL"] = updated_urls


    def get_image_urls(self, page_url):
        """ Gets the main image URL from a Wikipedia article """
        
        response = None
        try:
            response = requests.get(page_url, headers=self.headers)
        except Exception as exc:
            print(exc)
            return None
        
        if response is None or response.status_code != 200:
            return None
            
        soup = BeautifulSoup(response.content, "html.parser")
        og_image = soup.find("meta", property="og:image")

        if isinstance(og_image, Tag):
            try:
                return og_image.get("content")
            except Exception as exc:
                print(exc)
                return None
        else:
            print("og:image tag not found")
        return None



    def download_image(self, image_url, page_name, verbose=False):
        res = requests.get(image_url, headers=self.headers) 
        res.raise_for_status()
        
        if res.status_code != 200:
            print(f"Error scraping {page_name}: {res.status_code}")

        # Get the correct file extension
        file_ext = '.' + image_url.split('.')[-1].lower()
        image_file = os.path.join(self.my_folder, os.path.basename(page_name + file_ext))

        # Save the image
        with open(image_file, 'wb') as f:
            for chunk in res.iter_content(100000):
                f.write(chunk)

        if verbose:
            print(f"Downloaded: {image_file}")



    def scrap_image_URLs(self, download=False):
        # Download images from Wikipedia articles
        image_urls = pd.DataFrame(columns=["Scientific name", "Image URL"])
        for _, row in tqdm(self.wiki_urls_df.iterrows(), desc="Scraping Wikipedia images", unit="pages"):
            co_name = row["Common name"]
            sc_name = row["Scientific name"]
            page_url = row["Wikipedia page URL"]
            #image_url = row["Image URL"]
            try:
                if download:
                    self.download_image(page_url, co_name)

                new_row = pd.DataFrame([{"Scientific name": sc_name, "Image URL": self.get_image_urls(page_url=page_url)}])
                image_urls = pd.concat([image_urls, new_row], ignore_index=True)
                
            except:
                print(f"No image found for {co_name} :(")

        print("All done!")
        
        self.wiki_urls_df = self.wiki_urls_df.merge(image_urls, on= "Scientific name", how = "left")

