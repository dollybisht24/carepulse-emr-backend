let ioInstance = null;

const initSocket = (io) => {
  ioInstance = io;
  io.on('connection', (socket) => {
    console.log(`[Socket.IO Client Connected]: ${socket.id}`);

    // Allow clients to join specific doctor or room subscriptions
    socket.on('join:doctor', (doctorId) => {
      socket.join(`doctor:${doctorId}`);
    });

    socket.on('leave:doctor', (doctorId) => {
      socket.leave(`doctor:${doctorId}`);
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });
};

const getIO = () => {
  return ioInstance;
};

const emitAppointmentEvent = (eventName, data) => {
  if (ioInstance) {
    // Broadcast globally to all connected receptionists/dashboards
    ioInstance.emit(eventName, data);

    // Also broadcast to doctor-specific room if doctorId is present
    if (data?.doctorId) {
      ioInstance.to(`doctor:${data.doctorId}`).emit(eventName, data);
    }
  }
};

module.exports = {
  initSocket,
  getIO,
  emitAppointmentEvent,
};
