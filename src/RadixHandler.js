/* eslint-disable no-console */
import {radixUniverse, RadixUniverse, RadixIdentityManager, RadixNodeConnection, RadixTransactionBuilder, RadixAddress} from 'radixdlt'
import Long from 'long'

export default class RadixHandler {


    constructor() {
        radixUniverse.bootstrap(RadixUniverse.SUNSTONE)

        this.nodes = []
        this.atoms = {}

        const identityManager = new RadixIdentityManager()
        this.identity = identityManager.generateSimpleIdentity()

        this.rebuildAtom()
    }

    init(onEdgeChanged, onNewRoot) {
        this.onEdgeChanged = onEdgeChanged
        this.onNewRoot = onNewRoot

        return radixUniverse.getNodeConnection(Long.fromValue(1)).then(() => {
            const nodeList = radixUniverse.getLiveNodes()

            console.log(nodeList)
           

            this.connections = {}
            const promises = []

            for (const nodeInfo of nodeList) {
                const nodeId = RadixAddress.fromPublic(nodeInfo.nodeInfo.system.key.bytes).getUID().toString()

                this.nodes.push(nodeId)

                const connection =  new RadixNodeConnection(nodeInfo)
                this.connections[nodeId] = connection
                promises.push(connection.openConnection())
            }

            return Promise.all(promises)
        }).then(() => {
            for(const id in this.connections) {
                const connection = this.connections[id]
                connection.subscribe(this.identity.address.toString()).subscribe({
                    next: atomUpdate => {
                        this.atomUpdateReceived(connection, atomUpdate)
                    },
                    error: error => console.error('Subscription error:', error),
                })
            }
        })
    }


    atomUpdateReceived(connection, atomUpdate) {
        console.log(atomUpdate)

        const recievingVertexId = RadixAddress.fromPublic(connection.node.nodeInfo.system.key.bytes).getUID().toString()

        const hid = atomUpdate.atom.hid.toString()
        const atom = atomUpdate.atom


        if (atomUpdate.action === 'STORE') {
            // Add vertices
            const vertices = atom.temporalProof.vertices

            if (this.atoms[hid] === undefined) {
                this.atoms[hid] = []
                this.onNewRoot(recievingVertexId, hid)
            }


            for (let vertex of vertices) {
                const currentVertexId = RadixAddress.fromPublic(vertex.owner.bytes).getUID().toString()
                
                let previousVertexId = false
                for (let otherVertex of vertices) {
                    if (otherVertex.hid.equals(vertex.previous)) {
                        previousVertexId = RadixAddress.fromPublic(otherVertex.owner.bytes).getUID().toString()
                    }
                }
                
                // Only add new edges
                if (!previousVertexId || currentVertexId !== recievingVertexId) {
                    continue
                }
                
                let edgeExists = false
                for (let edge of this.atoms[hid]) {
                    if (edge.from === previousVertexId && edge.to === currentVertexId) {
                        edgeExists = true
                        break
                    }
                }

                if (!edgeExists) {
                    const edge = {
                        from: previousVertexId,
                        to: currentVertexId,
                        timestamp: Date.now()
                    }

                    this.atoms[hid].push(edge)

                    console.log(this)

                    this.onEdgeChanged(hid, edge, true)
                }
            }

        } else if (atomUpdate.action === 'DELETE') {
            // Remove vertices
            for(let i=0; i<this.atoms[hid].length; i++) {
                const edge = this.atoms[hid][i]

                if (edge.from === recievingVertexId || edge.to === recievingVertexId) {
                    this.atoms[hid].splice(i, 1);

                    this.onEdgeChanged(hid, edge, false)
                }
            }
        }
    }


    rebuildAtom() {
        this.builder = new RadixTransactionBuilder().createTokenSingleIssuance(
            this.identity.account,
            'TEST',
            this.getRandomString(4),
            'TEST',
            1,
            1,
        )
    }

    submitAtomRandomNode() {
        const nodeId = this.getRandomNodeId()

        this.submitAtom(nodeId)
    }

    submitAtom(nodeId) {
        const connection = this.connections[nodeId]

        const atom = this.builder.buildAtom()

        RadixTransactionBuilder.signAndSubmitAtom(atom, connection, this.identity, []).subscribe({
            next: console.log,
            error: (e) => {console.error('problem submitting atom', e)}
        })
    }

    getRandomNodeId() {
        return this.nodes[
            this.getRandomInt(this.nodes.length)
        ]
    }


    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max))
    }

    getRandomString(length) {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      
        for (let i = 0; i < length; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      
        return text;
    }


}