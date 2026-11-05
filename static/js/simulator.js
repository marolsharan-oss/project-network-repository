document.addEventListener("DOMContentLoaded", function () {
    const addButton = document.getElementById("addDeviceBtn");
    const generateButton = document.getElementById("generateBtn");
    const packetButton = document.getElementById("sendPacketBtn");

    const deviceType = document.getElementById("deviceType");
    const topologySelect = document.getElementById("topology");
    const deviceList = document.getElementById("deviceList");
    const status = document.getElementById("status");

    const devices = [];
    let nextId = 1;
    let packetTimer = null;

    if (typeof cytoscape === "undefined") {
        status.textContent = "Could not load Cytoscape.js. Check your internet connection.";
        return;
    }

    const cy = cytoscape({
        container: document.getElementById("cy"),

        elements: [],

        style: [
            {
                selector: "node",
                style: {
                    "label": "data(label)",
                    "background-color": "data(color)",
                    "color": "#ffffff",
                    "text-valign": "bottom",
                    "text-halign": "center",
                    "text-margin-y": 8,
                    "font-size": 12,
                    "width": 42,
                    "height": 42,
                    "border-width": 2,
                    "border-color": "#e2e8f0"
                }
            },
            {
                selector: "edge",
                style: {
                    "width": 3,
                    "line-color": "#64748b",
                    "curve-style": "bezier"
                }
            },
            {
                selector: ".packet",
                style: {
                    "background-color": "#facc15",
                    "border-color": "#f97316",
                    "width": 28,
                    "height": 28,
                    "z-index": 10
                }
            }
        ],

        layout: {
            name: "grid"
        }
    });

    function setStatus(message) {
        status.textContent = message;
    }

    function addDevice() {
        const type = deviceType.value;
        const id = "device" + nextId++;

        const colors = {
            Computer: "#0284c7",
            Router: "#16a34a",
            Switch: "#9333ea",
            Server: "#ea580c"
        };

        const device = {
            id: id,
            type: type,
            label: type + " " + devices.length
        };

        devices.push(device);

        cy.add({
            group: "nodes",
            data: {
                id: id,
                label: device.label,
                type: type,
                color: colors[type]
            }
        });

        const item = document.createElement("div");
        item.className = "device-item";
        item.textContent = device.label;
        deviceList.appendChild(item);

        cy.layout({ name: "circle", animate: true }).run();

        setStatus(device.label + " added successfully.");
    }

    function generateTopology() {
        if (devices.length < 2) {
            setStatus("Please add at least 2 devices first.");
            return;
        }

        cy.elements("edges").remove();

        const type = topologySelect.value;
        const ids = devices.map(device => device.id);

        function connect(a, b) {
            if (a === b) return;

            const edgeId = "edge_" + a + "_" + b;

            if (cy.getElementById(edgeId).length === 0) {
                cy.add({
                    group: "edges",
                    data: {
                        id: edgeId,
                        source: a,
                        target: b
                    }
                });
            }
        }

        if (type === "star") {
            const center = ids[0];

            for (let i = 1; i < ids.length; i++) {
                connect(center, ids[i]);
            }
        }

        else if (type === "ring") {
            for (let i = 0; i < ids.length; i++) {
                connect(ids[i], ids[(i + 1) % ids.length]);
            }
        }

        else if (type === "mesh") {
            for (let i = 0; i < ids.length; i++) {
                for (let j = i + 1; j < ids.length; j++) {
                    connect(ids[i], ids[j]);
                }
            }
        }

        else if (type === "bus") {
            const backbone = "backbone";

            cy.add({
                group: "nodes",
                data: {
                    id: backbone,
                    label: "Bus Backbone",
                    color: "#64748b"
                }
            });

            ids.forEach(id => connect(backbone, id));
        }

        cy.layout({
            name: type === "star" ? "breadthfirst" :
                  type === "mesh" ? "circle" :
                  "grid",
            animate: true,
            padding: 40
        }).run();

        setStatus(type.toUpperCase() + " topology generated!");
    }

    function sendPacket() {
        if (packetTimer) {
            clearInterval(packetTimer);
            packetTimer = null;
        }

        const edges = cy.edges();

        if (edges.length === 0) {
            setStatus("Generate a topology before sending a packet.");
            return;
        }

        const edge = edges[0];
        const source = edge.source();
        const target = edge.target();

        const packetId = "packet_" + Date.now();

        cy.add({
            group: "nodes",
            data: {
                id: packetId,
                label: "📦",
                color: "#facc15"
            },
            position: source.position()
        });

        const packet = cy.getElementById(packetId);

        setStatus("Sending packet from " +
            source.data("label") + " to " + target.data("label") + "...");

        packet.animate(
            { position: target.position() },
            {
                duration: 1500,
                complete: function () {
                    packet.remove();
                    setStatus("Packet delivered successfully!");
                }
            }
        );
    }

    addButton.addEventListener("click", addDevice);
    generateButton.addEventListener("click", generateTopology);
    packetButton.addEventListener("click", sendPacket);

    setStatus("Simulator ready. Add devices to begin.");
});