# Data visualization process book
In this file we will keep a log of what we do week by week.

## Week 8
Brainstorming about what kind of project we might do. We thought about combining our project with our ADA project but, unfortunately, we are not in the same group for that course so there was no point doing that. We brainstormed and came up with a few idea until we seemed pretty sure about one specific idea: trying to visualize the news in the World and where the news "come from". For example, we would like to ask some questions like "If we choose one country, which are the countries it talks the most about ?". Or maybe we would also like to know which are the countries that talk the most about this country in their news.

### How to do that ?
Good question ? We came up with a few ideas among which:

* We might want to visualize the flow "where the news are written => where they happen" and vice-versa. For example it would be a moving heat map-of-the-World layer. At one point we have the heatmap showing where the events are happening and then we can click on a switch so that the points corresponding to these events move smoothly to the places where the news about them are produced. For example, if something happens in Hong Kong and the New York Times writes about it then the point on the heatmap will move smoothly from Hong Kong to New York (and vice-versa if we click on the switch again)

* We might also want to visualize the "egoism" level of countries, maybe in a choropleth map. For example, the US would probably have a very high level of egoism since most of their news would be about themselves. The idea would really be to visualize how much a given country is aware of the rest of the world.

## Week 9

We start working. We divide the work among ourselves and we explore the dataset with much more details (we use mostly python for that because it is much more convenient than javascript) and we also start exploring d3 with more details also.
We also continue with the brainstorming from last week because, even if we have a general idea of what we want to do, we would like to be as clear as possible about our goals. Here is a sketch of our discussions:
![alt text](images/sketch_week_9.jpg)

We also came up with a new cool idea: instead of countries we might want to choose "events flows" for a given country (we have the CAMEO event code in our GDELT dataset which is very convenient for that). For example, instead of wanting to know which countries Switzerland speaks the most about, we would like to know which types of event it talks the most about instead ! Does it talk about negotiations, or wars, or protests ?

## Week 10
We had the idea to use the sankey diagram which seems to be very convenient for showing our data:
![alt text](images/sankey_sketch.jpg)

To incorporate the idea of visualizing events instead of countries, we might add a simple switch "Events/Countries" to that.
Of course, we would also draw a heatmap of events:
![alt text](images/sankey_heatmap_sketch.jpg)

We would also like to add a time widget so that the viewer can choose which time period he wants to focus on. But that may be a little too optimistic because we already have a lot of work to do. If we have time then we will add it!

We asked the assistant and showed him the sketches and he seemed to like it a lot. However, there is one problem remaining: in the GDELT dataset we have the news website URL but we do not have the country those news are coming from. So we need to find a way to deal with that. What came to our mind is to simply query those URLs and to take the IP address. Then we would get the country from this IP address. One problem with this method is that some news might host their website on a server in another country so it might not be 100% correct. However, we found a website listing the news websites in the world and the countries those news are located in. With the IP technique + a little manual work everything should bw fine now, We can get the news source country !

## Week 11
Managed to program a first basic interface:
![alt text](images/first_interface.png)

The data on the Sankey diagram is not correct since we did not finish processing the data but it should be pretty good until the end of the week (if we don't get stuck in some annoying bugs).
However we can already select the type of events we want to visualize on the heatmap, and it seems to work well.

Asked the prof about it, he told that it seems good but it is pretty ugly (I didn't intend to make it pretty in the beginning). He told me that there are too many checkboxes which is right so we will need a way to cateogrize further the types of events.

We met on Thursday and discussed with the design should be. One idea we have to respect is that we should not throw as much info as possible on the user as soon as he sees the webpage. So this is why we will show only the map with the event distribution in the beginning, without anything else. However, the user will see that he has the possibility to click on a country to see the country details in a drawer (drawers are a very good way to show information which we can hide at user will).
The details will include the sankey news flow diagram (two diagrams: events-based and country-based as discussed above). We will also have another drawer on the right to allow the user to filter the types of events she wants. The professor told me that there were too many types of events and this is why we have decided to do an accordion checkbox structure to allow "hierarchical checkboxes". In this hierarchy, we will have only four "super event types" (corresponding to the QuadClass attribute in our GDELT dataset) which the user can expand to show the event types. Those 20 event types can be further divided but we don't plan to implement this for now (unless we have time).

## Week 12
We are still working on the visualization. Ali is working on the accordion side menu for filtering event types and he's trying to make it as beautiful as possible, Maxime is working on processing the data in python so that we have data which is as clean as possible and Ahmed is working on the visualization, drawing the circles on the map with Leaflet and d3 and showing the sankey diagram information.

### The hover idea:
We thought of a new way to add interactivity to our sankey diagram. Maybe we could show additional information when the viewer hovers a link: when a link from a country to the selected country is hovered, we can color the link in a chosen color (let's say blue for the example) and then color all the corresponding events in the same blue. We can also add blue lines on the map which go from the source countries to the target events (for that we need the central geocoordinates for each country. [This](https://developers.google.com/public-data/docs/canonical/countries_csv) might be a good catch.)


### The flow problem
We realized that one thing was not so good with our sankey diagram. Actually, we don't event need a sankey diagram for this because we can represent such information with simple bar charts ! We simply need two bar charts: one for the source countries and one for the target countries (same for the event types). And also, the notion of flow does not really make sense in this context: the number of news which "enters" Switzerland is not the same as the number which "goes out". So we came up with this solution where, instead of putting the target countries on the right, we put the types of the source events.
![alt text](images/flow_equal_sol.jpg)
This way, the flow makes sense: the number of events (the width of the flow) is the same on both sides. However, this one has two disadvantages:
* same as before: we can represent the information with bar charts. So we are just adding chart junk here.
* it is not clear at first sight.

We thought about dropping the idea of the sankey diagram but then, we came up with something much better:
![alt text](images/sankey_final_sol.jpg)

This diagram allows us to keep the sankey (somehow we absolutely wanted to keep the sankey diagram to show this "event flow" information) and the disadvantages we mentioned before disappear: it is more difficult to represent this with a bar chart (we could still represent it with a 2d histograms but it is visually more difficult to read than the sankey diagram) and it is much clearer.

### circles: the nonprecision problem
Now we have our visualization with our red circles on the map:
![alt text](images/image_red_circles.png)
So we can see the red circles which show the distribution of events on the map. We noticed one problem: look at the big red circle at the center. It is not really directed at a special big city (like the other big circles we can typically see on important cities like New York, Los Angeles or Washington) but it is one of the biggest circles in the US. Actually, the problem is the data: we have a lot of news where the GDELT team didn't have enough resources to compute the exact location of the event so they simply put it at the centroid of the United States. This problem is also visible for other countries (or states also). So what do we do about this ? 

* We can simply drop those events but this is rather complicated: we have to find the centroid for each country (or states) and to make sure that the geolocation of the event doesn't coincide with it. However, it would probably not be the exact same location (except if we find out how GDELT generated it) so we would probably have to include the notion of "proximity". If the event is near the centroid of the country then we drop eat. And here again new problems show up: what if an important city is located at or near the centroid of the country/state. What does it mean "to be near the centroid" ? How do we handle that for big and small countries (even tiny ones like Liechtenstein).
* Or we can simply keep them. It is true that this information somehow disturbs the viewer but it is also a visualization of the GDELT dataset so we can keep it. Anyway, if the GDELT team finds more resources and is capable of geolocating these events with more precision in the future, our visualization will be cleaner !

So obviously we chose to keep all the events.
