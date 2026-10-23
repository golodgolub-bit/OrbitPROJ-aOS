using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;
namespace aOS.Windows;
public partial class MainWindow : Window
{
    public MainWindow() { InitializeComponent(); Loaded += OnLoaded; Closed += (_, _) => Browser.Dispose(); }
    private async void OnLoaded(object sender, RoutedEventArgs args)
    {
        try
        {
            var userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "aOS", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            await Browser.EnsureCoreWebView2Async(environment);
            var core = Browser.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping("aos.local", Path.Combine(AppContext.BaseDirectory, "Assets", "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
            core.Settings.IsWebMessageEnabled = false;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDevToolsEnabled = false;
            core.PermissionRequested += (_, e) => e.State = CoreWebView2PermissionState.Deny;
            core.NewWindowRequested += (_, e) => e.Handled = true;
            core.NavigationStarting += (_, e) =>
            {
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.Host != "aos.local") e.Cancel = true;
            };
            Browser.Source = new Uri("https://aos.local/demo/macos.html");
        }
        catch (Exception error)
        {
            MessageBox.Show("OrbitPROJ. / aOS by @qqDUCK could not start. Install the Microsoft Edge WebView2 Evergreen Runtime.\n\n" + error.Message, "OrbitPROJ. / aOS by @qqDUCK", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
