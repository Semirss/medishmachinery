// Enhanced order details with negotiation pricing display
// Insert after line 1807 (after itemsHtml display)

// Add pricing breakdown section
let pricingHTML = '';
if (order.originalPrice || order.counterOffer) {
    pricingHTML = `
    <div class="mt-6 bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-500">
      <h4 class="font-heading font-bold text-lg mb-3"><i class="fas fa-dollar-sign mr-2"></i>Pricing Details</h4>
      <div class="space-y-2">
        ${order.originalPrice ? `
          <div class="flex justify-between">
            <span class="text-gray-700">Original Base Price:</span>
            <span class="${order.counterOffer ? 'line-through text-gray-400' : 'font-bold text-gray-800'}">$${order.originalPrice.toLocaleString()}</span>
          </div>
        ` : ''}
        ${order.counterOffer ? `
          <div class="flex justify-between items-center bg-yellow-100 -mx-2 px-2 py-2 rounded">
            <span class="text-gray-700 font-medium"><i class="fas fa-handshake mr-2 text-orange-600"></i>Customer Counter Offer:</span>
            <span class="font-bold text-green-600 text-lg">$${order.counterOffer.price.toLocaleString()}</span>
          </div>
          ${order.counterOffer.notes ? `
            <div class="mt-2 p-3 bg-white rounded border border-yellow-200">
              <p class="text-sm text-gray-600"><span class="font-medium">Negotiation Notes:</span> ${order.counterOffer.notes}</p>
            </div>
          ` : ''}
          <div class="mt-3 p-3 bg-yellow-50 rounded border border-yellow-300">
            <p class="text-sm text-gray-700"><i class="fas fa-info-circle mr-2"></i><strong>Counter Offer Status:</strong> ${order.counterOffer.status === 'pending_review' ? 'Pending Your Review' : order.counterOffer.status}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Update action buttons to include reject button
let buttons = '';
if (order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'rejected') {
    buttons = `
    <button onclick="markOrderAsPaid('${order.id}')" class="px-6 py-3 bg-industrial-yellow text-industrial-gray font-bold rounded-xl hover:bg-industrial-orange transition-colors">
      Mark as Paid
    </button>
    <button onclick="rejectOrder('${order.id}')" class="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
      <i class="fas fa-times-circle mr-2"></i>Reject Order
    </button>
  `;
} else if (order.status === 'rejected') {
    buttons = `
    <div class="text-red-600 font-bold">
      <i class="fas fa-ban mr-2"></i>Order Rejected
    </div>
  `;
}

// Reject Order Function
function rejectOrder(orderId) {
    if (!confirm('Are you sure you want to reject this order? This action cannot be undone.')) {
        return;
    }

    const reason = prompt('Please provide a rejection reason (optional):');

    let orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
        showNotification('Error', 'Order not found', 'error');
        return;
    }

    orders[orderIndex].status = 'rejected';
    orders[orderIndex].rejectedAt = new Date().toISOString();
    orders[orderIndex].rejectionReason = reason || 'No reason provided';

    setOrders(orders);

    showNotification('Order Rejected', `Order ${orderId} has been rejected`, 'success');
    closeOrderDetails();
    renderOrders();
    renderDashboard();
}
