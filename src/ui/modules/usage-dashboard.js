import { FEATURE_LIMITS } from '../../constants.js';
import { getFeatureLimit, getUsageQuota, getAvailableModels } from '../../api/feature-limits.js';
import { getUserBalances } from '../../api/subscription.js';
import { STATE } from '../../state.js';

export default {
    id: 'usage-dashboard',
    title: 'Usage Dashboard',
    description: 'Monitor all your quotas and limits in one place',
    author: 'Slash',
    defaultEnabled: false,
    code(api, container) {
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '6px';
        grid.style.marginTop = '6px';
        container.appendChild(grid);

        const makeCard = (label, value, max, color) => {
            const card = document.createElement('div');
            card.style.background = 'rgba(255,255,255,0.04)';
            card.style.borderRadius = '8px';
            card.style.padding = '8px';
            card.style.border = '1px solid rgba(255,255,255,0.06)';
            card.innerHTML = `<div style="font-size:10px;color:rgba(255,255,255,0.45);margin-bottom:2px;">${label}</div><div style="font-size:15px;font-weight:600;color:${color};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}<span style="font-size:10px;font-weight:400;color:rgba(255,255,255,0.35);">/${max}</span></div>`;
            return card;
        };

        const status = document.createElement('div');
        status.style.fontSize = '11px';
        status.style.color = 'rgba(255,255,255,0.5)';
        status.style.marginBottom = '4px';
        status.textContent = 'Loading...';
        container.insertBefore(status, grid);

        const refreshBtn = document.createElement('button');
        refreshBtn.classList.add('cai-btn');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.style.width = '100%';
        container.appendChild(refreshBtn);

        async function load() {
            status.textContent = 'Fetching...';
            status.style.color = 'rgba(255,255,255,0.5)';
            grid.innerHTML = '';

            try {
                const features = Object.values(FEATURE_LIMITS);
                const results = await Promise.allSettled(features.map(f => getFeatureLimit(f)));
                const quotas = await getUsageQuota();
                let balance = null;
                if (STATE.userId) {
                    try { balance = await getUserBalances(STATE.userId); } catch(e) {}
                }

                features.forEach((feature, i) => {
                    const res = results[i];
                    let remaining = '?';
                    let max = '?';
                    let color = 'var(--cai-text-secondary)';
                    if (res.status === 'fulfilled' && res.value.data) {
                        const d = res.value.data;
                        remaining = d.count_remaining ?? d.count ?? '?';
                        max = d.max_limit ?? '?';
                        if (remaining < max * 0.2) color = 'var(--cai-accent-red)';
                        else if (remaining < max * 0.5) color = 'var(--cai-accent-amber)';
                        else color = 'var(--cai-accent-green)';
                    }
                    grid.appendChild(makeCard(feature.replace(/_/g, ' '), remaining, max, color));
                });

                const usageVal = quotas.data?.MONTH ?? '?';
                grid.appendChild(makeCard('Messages This Month', usageVal, '~', 'var(--cai-accent-purple)'));

                if (balance?.data?.balances) {
                    const bal = balance.data.balances[0]?.amount ?? '0';
                    grid.appendChild(makeCard('Charms', bal, '~', 'var(--cai-accent-pink)'));
                }

                status.textContent = 'Updated ' + new Date().toLocaleTimeString();
                status.style.color = 'var(--cai-accent-green)';
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
                status.style.color = 'var(--cai-accent-red)';
            }
        }

        refreshBtn.addEventListener('click', load);
        load();
    }
};
