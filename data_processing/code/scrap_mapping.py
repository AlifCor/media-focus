from bs4 import BeautifulSoup
import requests
import numpy as np
import codecs


def get_mapping_cc():

    html_doc = requests.get('http://www.nationsonline.org/oneworld/country_code_list.htm')
    data = html_doc.content
    soup = BeautifulSoup(data, 'html.parser')
    mapping = []
    for elem in soup.find_all('tr'):
        if elem.get('class') != None and elem.get('class')[0] == 'border1':
            country_name = ''

            if len(elem.find_all('td')[1].find_all('a')) > 0:
                country_name = elem.find_all('td')[1].find_all('a')[0].string
            elif len(elem.find_all('td')[1].find_all('em')) > 0:
                country_name = elem.find_all('td')[1].find_all('em')[0].string
            else:
                country_name = elem.find_all('td')[1].string
            mapping.append(np.array([u''.join(elem.find_all('td')[3].string).encode('utf-8').strip(), u''.join(country_name).encode('utf-8').strip()]))

    mapping = np.array(mapping)

    return mapping

file = open('../data/mapping_code_name.csv', 'w')
file.write('Code, Name')
for e in get_mapping_cc()[1:]:
    try:
        file.write(e[0].decode('utf-8')+', '+e[1].decode('utf-8')+'\n')
    except:
        name = str(e[1])
        name = name.replace('\\xc3\\xb4', 'o')
        name = name.replace('\\xc3\\xa9', 'e')
        name = name.replace('b"', '')
        name = name.replace('"', '')
        file.write(e[0].decode('utf-8')+', '+name+'\n')
file.close()
