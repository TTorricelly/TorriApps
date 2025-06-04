import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Button,
  Input,
  Switch,
  Spinner,
  Alert,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
} from '@material-tailwind/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import { professionalsApi } from '../../Services/professionals';
import { servicesApi } from '../../Services/services';
import { MultiSelect } from '../../Components';

export default function ProfessionalForm() {
  const navigate = useNavigate();
  const { professionalId } = useParams();

  const isEdit = Boolean(professionalId);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    is_active: true,
  });
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [availability, setAvailability] = useState([]);
  const [newSlot, setNewSlot] = useState({ day_of_week: 'monday', start_time: '', end_time: '' });
  const [breaks, setBreaks] = useState([]);
  const [newBreak, setNewBreak] = useState({ day_of_week: 'monday', start_time: '', end_time: '', name: '' });
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [newBlocked, setNewBlocked] = useState({ blocked_date: '', start_time: '', end_time: '', block_type: 'other', reason: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const loadProfessional = useCallback(async () => {
    try {
      setLoading(true);
      const data = await professionalsApi.getById(professionalId);
      setForm({
        full_name: data.full_name || '',
        email: data.email || '',
        password: '',
        is_active: data.is_active,
      });
      if (Array.isArray(data.services)) {
        setSelectedServices(data.services.map((s) => s.id));
      }
      if (data.photo_url) {
        setPhotoPreview(data.photo_url);
      }
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      showAlert('Erro ao carregar profissional', 'error');
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  const loadServices = useCallback(async () => {
    try {
      const svc = await servicesApi.getAll();
      setServices(svc);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const loadAvailability = useCallback(async () => {
    if (!isEdit) return;
    try {
      const data = await professionalsApi.getAvailability(professionalId);
      setAvailability(data);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
    }
  }, [professionalId, isEdit]);

  const loadBreaks = useCallback(async () => {
    if (!isEdit) return;
    try {
      const data = await professionalsApi.getBreaks(professionalId);
      setBreaks(data);
    } catch (err) {
      console.error('Erro ao carregar pausas:', err);
    }
  }, [professionalId, isEdit]);

  const loadBlockedTimes = useCallback(async () => {
    if (!isEdit) return;
    try {
      const data = await professionalsApi.getBlockedTimes(professionalId);
      setBlockedTimes(data);
    } catch (err) {
      console.error('Erro ao carregar bloqueios:', err);
    }
  }, [professionalId, isEdit]);

  useEffect(() => {
    if (isEdit) {
      loadProfessional();
      loadAvailability();
      loadBreaks();
      loadBlockedTimes();
    }
  }, [isEdit, loadProfessional, loadAvailability, loadBreaks, loadBlockedTimes]);

  useEffect(() => {
    if (isEdit) {
      loadProfessional();
    }
  }, [isEdit, loadProfessional]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let professional;
      if (isEdit) {
        professional = await professionalsApi.update(professionalId, {
          full_name: form.full_name,
          email: form.email,
          is_active: form.is_active,
          service_ids: selectedServices,
        });
        showAlert('Profissional atualizado com sucesso', 'success');
      } else {
        professional = await professionalsApi.create({
          ...form,
          service_ids: selectedServices,
          role: 'PROFISSIONAL',
        });
        showAlert('Profissional criado com sucesso', 'success');
        navigate('..');
      }
      if (photoFile && professional?.id) {
        await professionalsApi.uploadPhoto(professional.id, photoFile);
      }
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      showAlert('Erro ao salvar profissional', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  return (
    <div className="p-l">
      <Button
        variant="text"
        className="flex items-center gap-2 mb-l"
        onClick={() => navigate(-1)}
      >
        <ArrowLeftIcon className="h-4 w-4" /> Voltar
      </Button>
      <Card className="bg-bg-secondary text-text-primary max-w-xl mx-auto">
        <CardHeader shadow={false} floated={false} className="rounded-none p-l">
          <Typography variant="h5">
            {isEdit ? 'Editar Profissional' : 'Novo Profissional'}
          </Typography>
        </CardHeader>
        <CardBody>
          {alert.show && (
            <Alert color={alert.type === 'error' ? 'red' : 'green'} className="mb-m">
              {alert.message}
            </Alert>
          )}
          {loading ? (
            <div className="flex justify-center"><Spinner /></div>
          ) : (
            <Tabs value={activeTab} onChange={(val) => setActiveTab(val)}>
              <TabsHeader>
                <Tab value="basic">Dados Básicos</Tab>
                {isEdit && <Tab value="availability">Disponibilidade</Tab>}
                {isEdit && <Tab value="blocked">Bloqueios</Tab>}
                {isEdit && <Tab value="breaks">Pausas</Tab>}
              </TabsHeader>
              <TabsBody>
                <TabPanel value="basic" className="p-m">
                  <form onSubmit={handleSubmit} className="space-y-m">
                    <Input label="Nome" name="full_name" value={form.full_name} onChange={handleChange} required />
                    <Input label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} required />
                    {!isEdit && (
                      <Input label="Senha" name="password" type="password" value={form.password} onChange={handleChange} required />
                    )}
                    <MultiSelect
                      label="Serviços"
                      options={services.map(s => ({ value: s.id, label: s.name }))}
                      value={selectedServices}
                      onChange={setSelectedServices}
                    />
                    <div>
                      {photoPreview && (
                        <img src={photoPreview} alt="Foto" className="w-24 h-24 rounded-full mb-s object-cover" />
                      )}
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_active} onChange={(val) => setForm(prev => ({ ...prev, is_active: val }))} />
                      <span>{form.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <div className="pt-m">
                      <Button type="submit" color="blue" disabled={loading}>
                        {loading && <Spinner className="h-4 w-4" />} {isEdit ? 'Salvar Alterações' : 'Criar Profissional'}
                      </Button>
                    </div>
                  </form>
                </TabPanel>
                {isEdit && (
                  <TabPanel value="availability" className="p-m space-y-m">
                    {availability.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-s">
                        <span className="w-24 capitalize">{slot.day_of_week}</span>
                        <span>{slot.start_time} - {slot.end_time}</span>
                        <Button size="sm" variant="outlined" className="border-status-error text-status-error" onClick={() => professionalsApi.deleteAvailability(professionalId, slot.id).then(loadAvailability)}>
                          Excluir
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-s">
                      <select value={newSlot.day_of_week} onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary">
                        <option value="monday">Segunda</option>
                        <option value="tuesday">Terça</option>
                        <option value="wednesday">Quarta</option>
                        <option value="thursday">Quinta</option>
                        <option value="friday">Sexta</option>
                        <option value="saturday">Sábado</option>
                        <option value="sunday">Domingo</option>
                      </select>
                      <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <Button size="sm" onClick={() => professionalsApi.createAvailability(professionalId, newSlot).then(() => { setNewSlot({ day_of_week: 'monday', start_time: '', end_time: '' }); loadAvailability(); })}>Adicionar</Button>
                    </div>
                  </TabPanel>
                )}
                {isEdit && (
                  <TabPanel value="blocked" className="p-m space-y-m">
                    {blockedTimes.map((b) => (
                      <div key={b.id} className="flex items-center gap-s">
                        <span>{b.blocked_date}</span>
                        <span>{b.start_time} - {b.end_time}</span>
                        <Button size="sm" variant="outlined" className="border-status-error text-status-error" onClick={() => professionalsApi.deleteBlockedTime(professionalId, b.id).then(loadBlockedTimes)}>
                          Excluir
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-s">
                      <input type="date" value={newBlocked.blocked_date} onChange={(e) => setNewBlocked({ ...newBlocked, blocked_date: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <input type="time" value={newBlocked.start_time} onChange={(e) => setNewBlocked({ ...newBlocked, start_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <input type="time" value={newBlocked.end_time} onChange={(e) => setNewBlocked({ ...newBlocked, end_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <select value={newBlocked.block_type} onChange={(e) => setNewBlocked({ ...newBlocked, block_type: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary">
                        <option value="break">Pausa</option>
                        <option value="vacation">Férias</option>
                        <option value="sick_leave">Doença</option>
                        <option value="other">Outro</option>
                      </select>
                      <input type="text" placeholder="Motivo" value={newBlocked.reason} onChange={(e) => setNewBlocked({ ...newBlocked, reason: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <Button size="sm" onClick={() => professionalsApi.createBlockedTime(professionalId, newBlocked).then(() => { setNewBlocked({ blocked_date: '', start_time: '', end_time: '', block_type: 'other', reason: '' }); loadBlockedTimes(); })}>Adicionar</Button>
                    </div>
                  </TabPanel>
                )}
                {isEdit && (
                  <TabPanel value="breaks" className="p-m space-y-m">
                    {breaks.map((br) => (
                      <div key={br.id} className="flex items-center gap-s">
                        <span className="w-24 capitalize">{br.day_of_week}</span>
                        <span>{br.start_time} - {br.end_time}</span>
                        <span>{br.name}</span>
                        <Button size="sm" variant="outlined" className="border-status-error text-status-error" onClick={() => professionalsApi.deleteBreak(professionalId, br.id).then(loadBreaks)}>
                          Excluir
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-s">
                      <select value={newBreak.day_of_week} onChange={(e) => setNewBreak({ ...newBreak, day_of_week: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary">
                        <option value="monday">Segunda</option>
                        <option value="tuesday">Terça</option>
                        <option value="wednesday">Quarta</option>
                        <option value="thursday">Quinta</option>
                        <option value="friday">Sexta</option>
                        <option value="saturday">Sábado</option>
                        <option value="sunday">Domingo</option>
                      </select>
                      <input type="time" value={newBreak.start_time} onChange={(e) => setNewBreak({ ...newBreak, start_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <input type="time" value={newBreak.end_time} onChange={(e) => setNewBreak({ ...newBreak, end_time: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <input type="text" placeholder="Nome" value={newBreak.name} onChange={(e) => setNewBreak({ ...newBreak, name: e.target.value })} className="bg-bg-primary border border-bg-tertiary rounded-input px-s text-text-primary" />
                      <Button size="sm" onClick={() => professionalsApi.createBreak(professionalId, newBreak).then(() => { setNewBreak({ day_of_week: 'monday', start_time: '', end_time: '', name: '' }); loadBreaks(); })}>Adicionar</Button>
                    </div>
                  </TabPanel>
                )}
              </TabsBody>
            </Tabs>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
