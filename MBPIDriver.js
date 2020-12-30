


let xhr = new XMLHttpRequest();
xhr.addEventListener('load', loadData);
xhr.open('GET', "ClassTeams.json");
xhr.send();
let team = {};

function loadData(){

    let peopleSet = new Set();

    for(let line of this.responseText.split("\n")){
        if(line){
            let parse = JSON.parse(line);

            let person = parse["PersonTakingSurvey"];
            peopleSet.add(person);
            team[person] = {};

            let mbpi = parse["PersonalityType"];
            let teammate1 = parse["LastTeamMate1"];
            let teammate2 = parse["LastTeamMate2"];
            let teammate3 = parse["LastTeamMate3"];

            //console.log(person + " " + teammate1 + " " + teammate2 + " " + teammate3);

            team[person].personality = mbpi;

            team[person].teammates = [];

            if (teammate1.length != 0)
            {
                team[person].teammates.push(teammate1);
            }

            if (teammate2.length != 0)
            {
                team[person].teammates.push(teammate2);
            }

            if (teammate3.length != 0)
            {
                team[person].teammates.push(teammate3);
            }
        }
    }
    let peopleList = Array.from(peopleSet);

    makePeopleList(peopleList);
}

//use D3 to make <p> elements for each person
function makePeopleList(peopleList)
{
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

//  store name and position
let selectedPeople = [];
let selectedPerson = "";

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
        let personData = {};
        personData.name = d;
        personData.personality = team[d].personality;
        personData.x = canvasWidth * Math.random();
        personData.y = canvasHeight * Math.random();
        selectedPeople.push(personData);
        selectedPerson = d;
    } else { //unselected
        selectedPeople = selectedPeople.filter( x => x.name != d);
    }
    updateGraphVis();
}


const circleRadius = 50;

function updateGraphVis(){

    //find out which edges should be drawn.  We could use a
    //better data structure, but we'll just recompute each time
    //we add new actors
    let visibleEdges = [];
    for(let person of selectedPeople)
    {
        for(let edge of team[person.name].teammates)
        {
            if( person.name < edge && //only add 1 edge per actor pair
                //if the co star is also selected
                selectedPeople.find(x => x.name == edge))
                {
                    //console.log(person.name + " " + selectedPeople.find(x => x.name == edge).name)
                //store references to the data objects for the actors
                //which contain their positions
                visibleEdges.push(
                    {'source' : person,
                     'target' : selectedPeople.find(x =>
                                                    x.name == edge)
                    });
                }
        }
    }
    //console.log(visibleEdges);

    //draw the lines first so the appear behind the circles
    d3.select('#canvas')
        .selectAll('line')
        .data(visibleEdges, (d, i) =>
              d.source.name + d.target.name)
        .join(enter => {
            enter.append('line')
            //call this function on the new dom nodes
                .call(updateEdgePositions) //we'll also do this with forces
                .attr('stroke', '#002c3e')
                .attr('stroke-width', 5) //highlight
                .transition(500) //and fade out
                .attr('stroke-width', 2);
        }, update => {

        }, exit => {
            //fade out and disapper
            exit.transition(500)
                .attr('stroke', 'white')
                .remove()
        });


    d3.select('#canvas')
        .selectAll('g') //group, which will hold circle + text
        .data(selectedPeople, (d, i) => d.name) //"name" field is how to "connect" actors
        .join(enter => { //actors which don't have a circle yet
            let groups = enter.append('g')
                .call(d3.drag()
                      //make these draggable.  Functions will be called
                      //when we start, move, and stop dragging
                      .on('start', dragStarted)
                      .on('drag', dragging)
                      .on('end', dragEnded));

            let circles = groups.append('circle')
                .attr('r', circleRadius)
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y)
                .attr('stroke', 'black')
                .attr('fill', '#f7444e')
                .transition(1000)
                .attr('fill', '#78bcc4');

            let texts = groups.append('text')
                .text((d, i) => d.personality)
                .attr('x', (d, i) => d.x - circleRadius)
                .attr('y', (d, i) => d.y)

        }, update => { //actors which have a circle
        }, exit => { //circles which no longer have actors
            exit.remove();
        });

    setupSimulation(selectedPeople, visibleEdges);
    updateTeam(selectedPerson);
}

//called when making a line, and also on simulation updates
function updateEdgePositions(edges){
    //edges is all the line elements who need their positions updated
    //set the x and y positions based on the endpoint positions
    edges.attr('x1', (d, i) => d.source.x)
        .attr('y1', (d, i) => d.source.y)
        .attr('x2', (d, i) => d.target.x)
        .attr('y2', (d, i) => d.target.y);
}

//make it global to use elsewhere
let simulation = d3.forceSimulation();
function setupSimulation(selectedPeople, visibleEdges){
    const canvasWidth = parseFloat(d3.select('#canvas').style('width'));
    const canvasHeight = parseFloat(d3.select('#canvas').style('height'));


    simulation.nodes(selectedPeople) //nodes are the objects being moved
    //pull stuff towards the center of the viewport
        .force("center", d3.forceCenter(canvasWidth/2, canvasHeight/2))
    //push all the nodes apart
        .force("charge", d3.forceManyBody().strength(-5000))
    //pull nodes together along edges
        .force('spring', d3.forceLink(visibleEdges))
        .force('centeringX', d3.forceX(canvasWidth/2).strength(.5))
        .force('centeringY', d3.forceY(canvasHeight/2).strength(.5))
    //callback for every time the simulation is updated
    //(when the positions change)
        .on('tick', () => {
            //groups contain a circle + text
            let groups = d3.select('#canvas').selectAll('g');

            //update the text and circle positions
            groups.select('text')
                .attr('x', (d, i) => d.x - circleRadius/2)
                .attr('y', (d, i) => d.y );


            groups.select('circle')
                .attr('cx', (d, i) => d.x)
                .attr('cy', (d, i) => d.y);

            //and then the edges
            d3.select('#canvas').selectAll('line')
                .call(updateEdgePositions);

        })
        .alphaTarget(0.1).restart(); //make stuff move if it has stopped
}

function dragStarted(){
    //move the dragged element above others
    d3.select(this).raise();
}

//d is the data associated with the dragged element
function dragging(d){
    //fix the position of the dragged element
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragEnded(d){
    //unfix the position so it moves due to forces again
    d.fx = null;
    d.fy = null;
}

function updateTeam(selectedPerson)
{
    //console.log(selectedPerson);
    //console.log(team[selectedPerson].teammates);
    let teamlead = selectedPerson + "'s latest teammates:";
    d3.select('#teams').selectAll('p').remove();
    d3.select('#teams').selectAll('h2').remove();
    d3.select('#teams').insert('h2').text(teamlead);
    d3.select('#teams').selectAll('p')
        .data(team[selectedPerson].teammates) //every <p> is associated with an actor
        .join( //what should I do with the data/p's
            //3 cases:
            //data exists, DOM doesn't: "enter set"
            //data exists, dom exists: "update set"
            //data DOESN'T exist, Dom exists: "exit set"
            enter => { //enter is elements in case 1
                enter.append('p') //make a paragraph
                    .text((d, i) => d);
            }
        );
}
