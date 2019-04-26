// import sayHello from './hello';
import RadixHandler from './RadixHandler'
import {Howl, Howler} from 'howler';
import './index.scss';
import chroma from 'chroma-js'

import Two from 'two.js';



// colours
let default_colour = '#05A8AA'
let active_colours = [
    '#8338EC',
    '#4056F4',
    '#FB5607',
    '#FF006E',
]

// sounds
var travelling_sound = new Howl({
    src: [require("./travelling.mp3")],
    loop:true,
    volume:0.2,
    // autoplay: true
});

var hit_sound = new Howl({
    src: [require("./hit_node.mp3")]
});

var conflict_sound = new Howl({
    src: [require("./conflict.mp3")]
});

var dead_sound = new Howl({
    src: [require("./dead.mp3")]
});

var final_sound = new Howl({
    src: [require("./final.mp3")]
});

// the universe
let nodes = []
let sites = {}
let atoms = {}


const twoElement = document.getElementById('root')
let two = new Two({
    width: twoElement.clientWidth,
    height: twoElement.clientHeight,
    autostart: true
}).appendTo(twoElement);
  

const onNewRoot = function(nodeId, atomHID) {
    if (!(atomHID in atoms)) {
        atoms[atomHID] = {
            edges: {}
        }

        numberOfPendingAtoms--

        changeColourToActive(nodeId, getActiveColour(Object.values(atoms).length - 1))
    }
}



let numberOfPendingAtoms = 0
const onEdgeChanged = function(atomHID, edgeData, added) {
    const edgeId = edgeData.from+edgeData.to

    if (added) {
        if (!(atomHID in atoms)) {
            atoms[atomHID] = {
                edges: {}
            }

            numberOfPendingAtoms--
        }
        const atom = atoms[atomHID]
    
        if(!(edgeId in atom.edges)) {
            const colour = chroma(getActiveColour(Object.values(atoms).indexOf(atom)))
                .darken(1)
                .hex()

            // Create edge
            const edge = {
                shape: connect(edgeData.from, edgeData.to, colour),
                edge: edge,
            }

            atom.edges[edgeId] = edge

            changeColourToActive(edgeData.to, colour)
            sites[edgeData.to].used = true
            hit_sound.play()
        }
    } else {
        const atom = atoms[atomHID]
    
        if(edgeId in atom.edges) {
            // Remove edge
            const edge = atom.edges[edgeId]
            two.remove(edge.shape)
            delete atom.edges[edgeId]
            
            changeColourToDefault(edgeData.to)
            conflict_sound.play()
        }
    }

    
}


// global parameters
let radius = 30
let margin = 100




const radix = new RadixHandler()
radix.init(onEdgeChanged, onNewRoot).then(() => {

    nodes = radix.nodes

    const spacing = (two.width - margin*2 - radius*nodes.length) / (nodes.length)

    // initialise all the sites and draw them
    for (var i = 0; i < nodes.length; i++ ) {
        const nodeId = nodes[i]

        let x = margin + i*spacing + i*radius*2;
        // let y = two.height / 2;
        let y = randomInteger(margin, two.height - margin);

        let shape = two.makeCircle(x, y, radius)
        two.update()
        shape._renderer.elem.addEventListener('click', () => {
            if(sites[nodeId].used) return true;

            sites[nodeId].used = true

            const colour = chroma(getActiveColour(Object.values(atoms).length + numberOfPendingAtoms))
                .hex()
            
            numberOfPendingAtoms++
            
            changeColourToActive(nodeId, colour)

            hit_sound.play()

            radix.submitAtom(nodeId)
        }, false);


        sites[nodeId] = {
            circ : shape, 
            x : x,
            y : y
        };
        sites[nodeId]['circ'].fill = default_colour;
    }



    //radix.submitAtom()
})

document.getElementById('reset-atom').addEventListener('click', () => {
    
    for(const nodeId of nodes) {
        changeColourToActive(nodeId, getActiveColour(Object.values(atoms).length - 1))
        sites[nodeId].used = false
    }

    for(const atom of Object.values(atoms)) {

        for (const edge of Object.values(atom.edges)) {
            edge.shape.remove()
        }
    }

    numberOfPendingAtoms = 0

    radix.rebuildAtom()
})


two.bind('update', function() {
});



// helper functions
function random(min, max) {
    if (typeof max === 'undefined') {
        max = min || 1;
        min = 0;
    }
    return min + (max - min) * Math.random();
}

function randomInteger(min, max) {
    return Math.floor(random(min, max));
}

function changeColourToActive(nid, colour) {
	sites[nid]['circ'].fill = colour;
}

function changeColourToDefault(nid) {
	sites[nid]['circ'].fill = default_colour;
}

function connect(nid1, nid2, colour) {
	let x1 = sites[nid1]['x'];
	let y1 = sites[nid1]['y'];
	let x2 = sites[nid2]['x'];
	let y2 = sites[nid2]['y'];

	let theta = Math.atan((y2 - y1) / (x2 - x1));

	// let line = two.makeLine(x1 + radius * Math.cos(theta), y1 + radius * Math.sin(theta), x2 - radius * Math.cos(theta), y2 - radius * Math.sin(theta));
    let line = two.makeLine(x1, y1, x2, y2)
    line.linewidth = 3;
    line.stroke = colour;
    line.cap = 'round'
    
    return line
}

function getActiveColour(index) {
    return active_colours[index % active_colours.length]
}