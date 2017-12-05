# -*- coding: utf-8 -*-
from socket import getaddrinfo
import requests
import json
import re


def get_location(url):
    url = re.findall('www(?:[a-zA-Z]|[0-9]|[.])+', url)[0]
    ipaddr = getaddrinfo(url, 80)
    geody = "ipinfo.io/" + ipaddr[0][-1][0] + "/geo"
    r = requests.get('http://www.'+geody)
    return r.json()


def add_entry(path, key, value):
    with open(path, 'r') as json_data:
        if json_data.read() != '':
            json_data.seek(0)
            data = json.load(json_data)
            json_data.close()
            if key in data:
                return
        else:
            data = {}
        data[key] = value
        json_data = open(path, 'w')
        json.dump(data, json_data)
        json_data.close()

def entry_exists(path, key):
    with open(path, 'r') as json_data:
        if json_data.read() != '':
            json_data.seek(0)
            data = json.load(json_data)
            json_data.close()
            if key in data:
                return True
            return False
        else:
            json_data.close()
            return False