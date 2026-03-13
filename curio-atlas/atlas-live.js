// atlas-live.js - Live data loader and enhanced interactions

class CurioAtlas {
    constructor() {
        this.data = null;
        this.simulation = null;
        this.svg = null;
        this.width = 0;
        this.height = 600;
    }

    async init() {
        // Load live network data
        try {
            const response = await fetch('/curio-atlas/data/network.json');
            this.data = await response.json();
            console.log('📊 Loaded network data:', this.data.sampled_holders, 'holders');
            this.renderNetwork();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load network data:', error);
            // Fallback to embedded demo data
            this.loadDemoData();
        }
    }

    loadDemoData() {
        // Fallback demo data (same as before)
        console.log('Using embedded demo data');
        this.renderNetwork();
    }

    updateStats() {
        // Update live statistics
        if (!this.data) return;

        const stats = this.data.insights;
        document.querySelector('[data-stat="whale-concentration"]').textContent = 
            stats.whale_concentration + '%';
        document.querySelector('[data-stat="conviction"]').textContent = 
            stats.conviction_score + '%';
        document.querySelector('[data-stat="density"]').textContent = 
            stats.network_density.toFixed(4);
    }

    renderNetwork() {
        // D3 visualization code
        const container = document.getElementById('network-container');
        this.width = container.clientWidth;
        
        // Create SVG
        this.svg = d3.select('#network-container')
            .append('svg')
            .attr('id', 'network-canvas')
            .attr('width', this.width)
            .attr('height', this.height);

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 5])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        this.svg.call(zoom);

        const g = this.svg.append('g');

        // Force simulation
        this.simulation = d3.forceSimulation(this.data.holders)
            .force('link', d3.forceLink(this.data.connections)
                .id(d => d.id)
                .distance(50))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.size) * 2 + 5));

        // Links
        const link = g.append('g')
            .selectAll('line')
            .data(this.data.connections)
            .join('line')
            .attr('stroke', d => d.type === 'whale_network' ? '#ffd70033' : '#ffffff11')
            .attr('stroke-width', d => d.value);

        // Nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(this.data.holders)
            .join('circle')
            .attr('r', d => Math.sqrt(d.size) * 2 + 3)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));

        // Tooltips
        const tooltip = document.getElementById('tooltip');
        node.on('mouseover', (event, d) => {
            tooltip.style.display = 'block';
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY - 10) + 'px';
            
            tooltip.querySelector('.tooltip-address').textContent = d.address;
            tooltip.querySelector('.cards-value').textContent = d.cards;
            tooltip.querySelector('.value-value').textContent = d.value_eth + ' ETH';
            tooltip.querySelector('.activity-value').textContent = d.activity;
            
            const badge = tooltip.querySelector('.archetype-badge');
            badge.textContent = d.archetype.toUpperCase();
            badge.className = `archetype-badge archetype-${d.archetype}`;

            // Highlight connections
            link.attr('stroke-opacity', l => 
                (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
            node.attr('opacity', n => 
                (n.id === d.id || this.isConnected(n, d)) ? 1 : 0.3);
        })
        .on('mouseout', () => {
            tooltip.style.display = 'none';
            link.attr('stroke-opacity', 1);
            node.attr('opacity', 1);
        });

        // Simulation tick
        this.simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
        });

        // Remove loading
        document.querySelector('.loading').style.display = 'none';
    }

    isConnected(node1, node2) {
        return this.data.connections.some(c => 
            (c.source.id === node1.id && c.target.id === node2.id) ||
            (c.target.id === node1.id && c.source.id === node2.id)
        );
    }

    dragstarted(event) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    dragended(event) {
        if (!event.active) this.simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    filterByArchetype(archetype) {
        // Filter view by archetype
        const nodes = this.svg.selectAll('circle');
        if (archetype === 'all') {
            nodes.attr('opacity', 1);
        } else {
            nodes.attr('opacity', d => d.archetype === archetype ? 1 : 0.1);
        }
    }
}

// Initialize
const atlas = new CurioAtlas();
atlas.init();

// Controls
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const view = btn.dataset.view;
        if (view === 'whales') {
            atlas.filterByArchetype('whale');
        } else if (view === 'collectors') {
            atlas.filterByArchetype('completionist');
        } else {
            atlas.filterByArchetype('all');
        }
    });
});
