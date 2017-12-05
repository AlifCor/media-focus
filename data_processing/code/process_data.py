import pandas as pd
import datetime
import numpy as np
from bs4 import BeautifulSoup
import requests
import re

from fetch_data import fetch_df


def compute_processed_data(start, end=None, name='data_cleaned'):
    if end == None:
        df = fetch_df(start)
    if end != None:
        days = [start+n*datetime.timedelta(days=1) for n in range((end-start).days+1)]
        df = pd.concat([fetch_df(day) for day in days])
    data_kept = df[['IsRootEvent', 'QuadClass', 'EventCode', 'EventRootCode', 'ActionGeo_Lat', 'ActionGeo_Long', 'ActionGeo_CountryCode', 'Sources']]
    data_kept = data_kept.dropna(axis=0)
    
    
    mapping = get_mapping_cc()
    
    fips_to_alpha = {}
    alpha_to_name = {}
    tld_to_name = {}


    for x in mapping:
        fips_to_alpha[x[1]] = x[2]
        alpha_to_name[x[2]] = x[0]
        tld_to_name[x[3]] = x[0]
    
    fips_to_alpha['RB'] = 'SRB'
    
    data_kept['country_code_alpha'] = data_kept['ActionGeo_CountryCode'].apply(lambda x: fips_to_alpha[x] if x in fips_to_alpha else 'None')
    data_kept = data_kept[data_kept['country_code_alpha'] != 'None']
    data_kept['country_name'] = data_kept['country_code_alpha'].apply(lambda x: alpha_to_name[x] if x in alpha_to_name else 'None')
    data_kept['source_country_name'] = data_kept['Sources'].apply(lambda x: get_tld(x, tld=True)).apply(lambda x: tld_to_name[x] if x in tld_to_name else 'Unknown')
    source_country = pd.read_csv('../data/clean_url_to_country.csv')
    mapping = source_country[['Country name', 'Clean URL']].drop_duplicates().set_index('Clean URL')['Country name']
    dic = mapping.to_dict()
    
    dic['4-traders.com'] = 'France'
    dic['news.xinhuanet.com'] = 'China'
    dic['sputniknews.com'] = 'Russia'
    dic['yahoo.com'] = 'United States'
    dic['globalsecurity.org'] = 'United States'
    dic['india.com'] = 'India'
    dic['malaysiandigest.com'] = 'Malaysia'
    dic['freerepublic.com'] = 'United States'
    
    data_kept.loc[data_kept['source_country_name'] == 'Unknown', 'source_country_name'] = data_kept.loc[data_kept['source_country_name'] == 'Unknown', 'Sources'].apply(lambda x: get_tld(x)).apply(lambda x: dic[x] if x in dic else 'Unknown')

    name_to_alpha = {alpha_to_name[x].strip(): x for x in alpha_to_name}
    data_kept.loc[data_kept['source_country_name'] == 'South Korea', 'source_country_name'] = 'Korea, South'
    data_kept.loc[data_kept['source_country_name'] == 'North Korea', 'source_country_name'] = 'Korea, North'
    data_kept.loc[data_kept['source_country_name'] == 'Bahamas', 'source_country_name'] = 'Bahamas, The'
    data_kept.loc[data_kept['source_country_name'] == 'Czech Republic', 'source_country_name'] = 'Czechia'
    data_kept.loc[data_kept['source_country_name'] == 'Western Samoa', 'source_country_name'] = 'Samoa'
    data_kept.loc[data_kept['source_country_name'] == 'Myanmar', 'source_country_name'] = 'Burma'
    data_kept.loc[data_kept['source_country_name'] == 'United States Virgin Islands', 'source_country_name'] = 'Virgin Islands'
    data_kept.loc[data_kept['source_country_name'] == 'Gambia', 'source_country_name'] = 'Gambia, The'
    data_kept.loc[data_kept['source_country_name'] == 'Falkland Islands', 'source_country_name'] = 'Falkland Islands (Islas Malvinas)'
    data_kept.loc[data_kept['source_country_name'] == 'Brunei Darussalam', 'source_country_name'] = 'Brunei'
    data_kept['source_country_code'] = data_kept['source_country_name'].apply(lambda x: name_to_alpha[x.strip()] if x.strip() in name_to_alpha else 'INT')
    
    data_kept = data_kept[['IsRootEvent', 'QuadClass', 'EventCode', 'EventRootCode', 'ActionGeo_Lat', 'ActionGeo_Long', 'country_code_alpha', 'source_country_code']]
    data_kept.to_csv('../data/'+str(name)+'.csv')
    
    
def get_tld(url, tld=False):
            
    url_pair = re.findall(r'\b(?!www\.)([a-zA-Z0-9-]+(\.[a-z]+)+)', url.lower())

    if(url_pair == []):
        return url
    else:
        if tld:
            return url_pair[0][1]
        else:
            return url_pair[0][0]

        
def get_mapping_cc():

    html_doc = requests.get('https://www.cia.gov/library/publications/the-world-factbook/appendix/appendix-d.html')

    soup = BeautifulSoup(html_doc.content, 'html.parser')

    mapping = []

    for elem in soup.find_all('div'):
        if elem.get('class') != None and elem.get('class')[0] == 'category_data':
            mapping.append(np.array([elem.find_all('td')[0].a.string, elem.find_all('td')[1].string, elem.find_all('td')[4].string, elem.find_all('td')[7].string]))

    mapping = np.array(mapping)
    
    return mapping