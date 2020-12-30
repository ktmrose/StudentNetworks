

let xhr = new XMLHttpRequest();
xhr.addEventListener('load', loadData);
xhr.open('GET', "FillerData.json");
xhr.send();

function loadData()
{
    console.log('Loading data');
    let peopleSet = new Set();
    for(let line of this.responseText.split("\n"))
    {
        if(line)
        {
            let parsed = JSON.parse(line);

            let person = parsed["PersonTakingSurvey"];
            peopleSet.add(person);
        }
    }
    let peopleList = Array.from(peopleSet);

    makePeopleList(peopleList);
}

//use D3 to make <p> elements for each actor
function makePeopleList(peopleList){

    d3.select('#peopleDiv').selectAll('p')
        .data(peopleList) //every <p> is associated with an actor
        .join( //what should I do with the data/p's
            //3 cases:
            //data exists, DOM doesn't: "enter set"
            //data exists, dom exists: "update set"
            //data DOESN'T exist, Dom exists: "exit set"
            enter => { //enter is elements in case 1
                enter.append('p') //make a paragraph
                    .text((d, i) => d)
                    .on("click", handleClick);
            }
        );

}

/*
  1.  select actors from list
  2.  add circles + names to svg
  3.  add edges (lines) to svg
  4.  spring force simulation
  drag nodes
  hover highlights
  draw movies on timeline

*/

// actors will store name and position
let selectedActors = [];

function handleClick(d, i){
    //3 pieces of info:
    // this -> DOM element that was clicked
    // d -> element from data array associated with it
    // i -> index into the data array for this element

    let elem = d3.select(this);

    elem.classed("selected", () => !d3.select(this).classed("selected"));

    if(elem.classed("selected")){ //is now selected
        let canvasWidth = parseFloat(d3.select('#canvas').style('width'));
        let canvasHeight = parseFloat(d3.select('#canvas').style('height'));
        let actorData = {};
        actorData.name = d;
        actorData.x = canvasWidth * Math.random();
        actorData.y = canvasHeight * Math.random();
        selectedActors.push(actorData);
    } else { //unselected
        selectedActors = selectedActors.filter( x => x.name != d);
    }

    updateGraphVis();
}


const circleRadius = 50;

function updateGraphVis(){

    d3.select('#canvas')
        .selectAll('g') //group, which will hold circle + text
        .data(selectedActors, (d, i) => d.name) //"name" field is how to "connect" actors
        .join(enter => { //actors which don't have a circle yet
            let groups = enter.append('g');
            let circles = groups.append('circle')
                .attr('r', circleRadius)
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y)
                .attr('stroke', 'black')
                .attr('fill', 'red')
                .transition(500)
                .attr('fill', 'white');

            let texts = groups.append('text')
                .text((d, i) => d.name)
                .attr('x', (d, i) => d.x - circleRadius)
                .attr('y', (d, i) => d.y)

        }, update => { //actors which have a circle
        }, exit => { //circles which no longer have actors
            exit.remove();
        });


}
