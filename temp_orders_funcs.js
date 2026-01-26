// Orders Functions for index.html
function openOrders() {
    renderOrders();
    document.getElementById('ordersModal').classList.remove('hidden');
}

function closeOrders() {
    document.getElementById('ordersModal').classList.add('hidden');
}

function renderOrders() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    const ordersContent = document.getElementById('ordersContent');
    const ordersEmpty = document.getElementById('ordersEmpty');

    if (orders.length === 0) {
        ordersContent.innerHTML = '';
        ordersEmpty.classList.remove('hidden');
        return;
    }

    ordersEmpty.classList.add('hidden');
    let html = '';

    orders.forEach((order) => {
        const orderDate = new Date(order.date).toLocaleDateString();
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'confirmed': 'bg-green-100 text-green-800 border-green-200',
            'completed': 'bg-blue-100 text-blue-800 border-blue-200',
            'cancelled': 'bg-red-100 text-red-800 border-red-200',
            'rejected': 'bg-red-100 text-red-800 border-red-200'
        };
        const statusClass = statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';

        html += `
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-heading font-bold text-lg text-industrial-dark">${order.id}</h3>
            <p class="text-gray-500 text-sm"><i class="far fa-calendar mr-2"></i>${orderDate}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass}">
            ${order.status.toUpperCase()}
          </span>
        </div>

        <div class="space-y-3 border-t pt-4">
          ${order.items.map((item) => `
            <div class="flex justify-between items-center">
              <div>
                <p class="font-medium text-gray-800">${item.machine.name}</p>
                <p class="text-sm text-gray-500">
                  ${item.isRental ? `Rental: ${item.startDate} to ${item.endDate}` : 'Purchase'}
                </p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mt-4 pt-4 border-t space-y-2">
          ${order.originalPrice ? `
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Original Price:</span>
              <span class="${order.counterOffer ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}">$${order.originalPrice.toLocaleString()}</span>
            </div>
          ` : ''}
          ${order.counterOffer ? `
            <div class="flex justify-between text-sm bg-yellow-50 -mx-2 px-2 py-1 rounded">
              <span class="text-gray-600 font-medium"><i class="fas fa-handshake mr-2"></i>Negotiated Price:</span>
              <span class="text-green-600 font-bold">$${order.counterOffer.price.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="flex justify-between items-center font-heading">
            <span class="text-lg font-bold text-gray-800">Total:</span>
            <span class="text-2xl font-bold text-industrial-yellow">$${order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
    });

    ordersContent.innerHTML = html;
}
