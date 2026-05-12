using Microsoft.AspNetCore.SignalR;

namespace DecentralizedVLab.Hubs;

public class SyncHub : Hub
{
    // Студент подключается к конкретной задаче/комнате
    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", Context.ConnectionId);
    }

    // Студент отключается
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserLeft", Context.ConnectionId);
    }

    // Ретрансляция бинарных патчей Y.js (CRDT) другим участникам комнаты
    // Обрати внимание: сервер НЕ читает и НЕ понимает этот код, он просто гоняет байты. Это экономит CPU.
    public async Task SendDocumentUpdate(string roomId, byte[] update)
    {
        // Отправляем всем в комнате, КРОМЕ отправителя
        await Clients.OthersInGroup(roomId).SendAsync("ReceiveDocumentUpdate", update);
    }
}