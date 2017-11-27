# -*- coding: utf-8 -*-

import io
import requests
import zipfile
import pandas as pd

data_directory = "../data"
gdelt_directory = "{}/gdelt".format(data_directory)

def load_column_names():
    path = "{}/gdelt_column_names.csv".format(data_directory)
    return pd.read_csv(path, header=None).T.values.tolist()[0]

def get_filename(date):
    return "{y}{m}{d}.export.CSV".format(y=date.year, m=date.month, d=date.day)

def get_file_path(date):
    return "{d}/{f}".format(d=gdelt_directory, f=get_filename(date))

def create_df(path_or_buffer):
    return pd.read_csv(path_or_buffer, sep="\t", header=None, usecols=range(len(load_column_names())), names=load_column_names(), index_col=0)

def load_df(date):
    return create_df(get_file_path(date))

def download_df(date, should_save=True):
        filename = get_filename(date)
        r = requests.get('http://data.gdeltproject.org/events/{}.zip'.format(filename))
        z = zipfile.ZipFile(io.BytesIO(r.content))
        if should_save:
            z.extract(filename, gdelt_directory)
        return create_df(z.open(filename))
    
def fetch_df(date, should_save=True):
    try:
        return load_df(date)
    except:
        print("downloading file...")
        return download_df(date, should_save)